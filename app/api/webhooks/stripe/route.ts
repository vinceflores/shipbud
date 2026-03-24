// app/api/webhooks/stripe/route.ts
export const runtime = 'nodejs';

import { stripe } from '@/lib/stripe';
import  prisma  from '@/lib/prisma';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency check (INV-07)
  const existing = await prisma.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return new Response('OK', { status: 200 });
  await prisma.stripeEvent.create({ data: { id: event.id } });

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object;
      const stripeSubId = s.subscription as string;
      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
      await prisma.subscription.create({
        data: {
          ownerId: s.client_reference_id!,
          stripeCustomerId: s.customer as string,
          stripeSubId,
          plan: 'PRO',
          status: 'trialing',
          trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        },
      });
      break;
    }
    case 'customer.subscription.updated': {
      const s = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubId: s.id },
        data: {
          status: s.status,
          currentPeriodEnd: new Date(s.current_period_end * 1000),
        },
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const s = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubId: s.id },
        data: { plan: 'FREE', status: 'canceled' },
      });
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
// ```

// **6. Add env vars to Vercel**
// ```
// STRIPE_SECRET_KEY
// STRIPE_WEBHOOK_SECRET
// STRIPE_PRO_PRICE_ID
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY