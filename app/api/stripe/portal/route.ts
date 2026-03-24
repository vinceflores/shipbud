// app/api/stripe/portal/route.ts
export const runtime = 'nodejs';

import { auth0 } from '@/lib/auth0';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth0.getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const sub = await prisma.subscription.findUnique({
    where: { ownerId: session.user.sub },
  });

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub!.stripeCustomerId,
    return_url: `${process.env.AUTH0_BASE_URL}/settings`,
  });

  return Response.json({ url: portal.url });
}