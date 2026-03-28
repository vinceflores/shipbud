export const runtime = 'nodejs';

import { auth0 } from '@/lib/auth0';
import { stripe } from '@/lib/stripe';
import { getOrCreateTrialSubscription } from '@/lib/subscription';

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

export async function POST(request: Request) {
  const session = await auth0.getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const baseUrl = getBaseUrlFromRequest(request);

  const subscription = await getOrCreateTrialSubscription(session.user.sub);
  if (subscription?.stripeSubId) {
    return Response.json(
      { error: 'You already have an active billing subscription. Use the billing portal instead.' },
      { status: 400 },
    );
  }

  const now = new Date();
  const isActiveAppTrial =
    subscription?.plan === 'PRO' &&
    subscription.status === 'trialing' &&
    !subscription.stripeSubId &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt.getTime() > now.getTime();

  const trialEndSeconds = isActiveAppTrial
    ? Math.floor(subscription!.trialEndsAt!.getTime() / 1000)
    : null;

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: new URL('/dashboard?upgraded=true', baseUrl).toString(),
    cancel_url: new URL('/pricing', baseUrl).toString(),
    client_reference_id: session.user.sub,
    ...(typeof session.user.email === 'string' && session.user.email.trim()
      ? { customer_email: session.user.email }
      : {}),
    ...(trialEndSeconds
      ? {
          subscription_data: {
            trial_end: trialEndSeconds,
          },
        }
      : {}),
  });

  return Response.json({ url: checkout.url });
}