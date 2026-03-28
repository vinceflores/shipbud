import prisma from '@/lib/prisma';

const TRIAL_DAYS = 30;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getOrCreateTrialSubscription(ownerId: string) {
  const now = new Date();

  let subscription = await prisma.subscription.findUnique({
    where: { ownerId },
  });

  if (!subscription) {
    const trialEndsAt = addDays(now, TRIAL_DAYS);
    subscription = await prisma.subscription.create({
      data: {
        ownerId,
        plan: 'PRO',
        status: 'trialing',
        trialEndsAt,
        currentPeriodEnd: trialEndsAt,
      },
    });

    return subscription;
  }

  // Stripe-backed subscriptions are managed by webhooks.
  if (subscription.stripeSubId) return subscription;

  // App-managed trial: enforce expiry.
  if (
    subscription.status === 'trialing' &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt.getTime() <= now.getTime()
  ) {
    subscription = await prisma.subscription.update({
      where: { ownerId },
      data: {
        plan: 'FREE',
        status: 'canceled',
        currentPeriodEnd: now,
      },
    });
  }

  return subscription;
}
