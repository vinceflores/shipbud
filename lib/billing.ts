import type { Subscription } from '@/app/generated/prisma/client';

export type EffectivePlan = 'FREE' | 'PRO';

export function isProSubscription(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.plan !== 'PRO') return false;

  if (subscription.status === 'active') return true;

  if (subscription.status === 'trialing') {
    if (!subscription.trialEndsAt) return true;
    return subscription.trialEndsAt.getTime() > Date.now();
  }

  return false;
}

export function getEffectivePlan(subscription: Subscription | null): EffectivePlan {
  return isProSubscription(subscription) ? 'PRO' : 'FREE';
}
