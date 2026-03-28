// app/api/stripe/portal/route.ts
export const runtime = 'nodejs';

import { auth0 } from '@/lib/auth0';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

function getBaseUrlFromRequest(request: Request): string {
  const envBase = process.env.AUTH0_BASE_URL?.trim();

  if (envBase) {
    try {
      return new URL(envBase).origin;
    } catch {
      const needsScheme = !/^https?:\/\//i.test(envBase);
      const scheme = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(envBase)
        ? 'http'
        : 'https';
      const withScheme = needsScheme ? `${scheme}://${envBase}` : envBase;

      try {
        return new URL(withScheme).origin;
      } catch {
        // Fall through to request-derived base URL.
      }
    }
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');
  const url = new URL(request.url);
  const proto = forwardedProto ?? url.protocol.replace(':', '');

  if (host) return `${proto}://${host}`;
  return url.origin;
}

export async function GET(request: Request) {
  const session = await auth0.getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const baseUrl = getBaseUrlFromRequest(request);

  const sub = await prisma.subscription.findUnique({
    where: { ownerId: session.user.sub },
  });

  if (!sub) {
    return Response.json(
      { error: 'No subscription found for this account.' },
      { status: 404 },
    );
  }

  if (!sub.stripeCustomerId) {
    return Response.json(
      { error: 'No billing portal available until you add a payment method.' },
      { status: 400 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: new URL('/settings', baseUrl).toString(),
  });

  return Response.json({ url: portal.url });
}