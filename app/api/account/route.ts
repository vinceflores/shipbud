export const runtime = 'nodejs';

import { auth0 } from '@/lib/auth0';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

async function maybeDeleteAuth0User(userId: string) {
  const domain = process.env.AUTH0_MGMT_DOMAIN;
  const clientId = process.env.AUTH0_MGMT_CLIENT_ID;
  const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    return;
  }

  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  });

  if (!tokenRes.ok) {
    return;
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return;
  }

  await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${tokenData.access_token}` },
  });
}

export async function DELETE() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const ownerId = session.user.sub;

  const subscription = await prisma.subscription.findUnique({
    where: { ownerId },
  });

  if (subscription?.stripeSubId) {
    try {
      // Cancel in Stripe before deleting local records.
      // (Stripe may still emit webhook events; handlers are tolerant.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subs: any = stripe.subscriptions;
      if (typeof subs.cancel === 'function') {
        await subs.cancel(subscription.stripeSubId);
      } else {
        await subs.del(subscription.stripeSubId);
      }
    } catch {
      // Swallow Stripe errors so account deletion can proceed.
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.deleteMany({ where: { ownerId } });
    await tx.subscription.deleteMany({ where: { ownerId } });
  });

  // Best-effort delete Auth0 identity if Management API is configured.
  await maybeDeleteAuth0User(ownerId);

  return new Response(null, { status: 204 });
}
