export const runtime = 'nodejs';

import { auth0 } from '@/lib/auth0';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const session = await auth0.getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.AUTH0_BASE_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.AUTH0_BASE_URL}/pricing`,
    client_reference_id: session.user.sub,
    subscription_data: {
      trial_period_days: 14,
    },
  });

  return Response.json({ url: checkout.url });
}