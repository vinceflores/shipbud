// app/api/webhooks/stripe/route.ts
export const runtime = 'nodejs';

import { stripe } from '@/lib/stripe';
import  prisma  from '@/lib/prisma';
import type Stripe from 'stripe';

function getSubscriptionCurrentPeriodEndSeconds(subscription: Stripe.Subscription): number | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === 'number');

  if (periodEnds.length === 0) return null;
  return Math.max(...periodEnds);
}

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
      const ownerId = s.client_reference_id;

      if (!ownerId) {
        break;
      }
      const stripeSubId = s.subscription as string;
      const stripeSub = (await stripe.subscriptions.retrieve(stripeSubId)) as Stripe.Subscription;
      const currentPeriodEndSeconds = getSubscriptionCurrentPeriodEndSeconds(stripeSub);

      await prisma.subscription.upsert({
        where: { ownerId },
        create: {
          ownerId,
          stripeCustomerId: s.customer as string,
          stripeSubId,
          plan: 'PRO',
          status: stripeSub.status,
          trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
          currentPeriodEnd: currentPeriodEndSeconds ? new Date(currentPeriodEndSeconds * 1000) : new Date(),
        },
        update: {
          stripeCustomerId: s.customer as string,
          stripeSubId,
          plan: 'PRO',
          status: stripeSub.status,
          trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
          ...(currentPeriodEndSeconds
            ? { currentPeriodEnd: new Date(currentPeriodEndSeconds * 1000) }
            : {}),
        },
      });
      break;
    }
    case 'customer.subscription.updated': {
      const s = event.data.object as Stripe.Subscription;
      const currentPeriodEndSeconds = getSubscriptionCurrentPeriodEndSeconds(s);
      await prisma.subscription.updateMany({
        where: { stripeSubId: s.id },
        data: {
          plan: 'PRO',
          status: s.status,
          trialEndsAt: s.trial_end ? new Date(s.trial_end * 1000) : null,
          ...(currentPeriodEndSeconds
            ? { currentPeriodEnd: new Date(currentPeriodEndSeconds * 1000) }
            : {}),
        },
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const s = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
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