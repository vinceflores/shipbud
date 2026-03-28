import Link from 'next/link';

import { auth0 } from '@/lib/auth0';
import { getEffectivePlan } from '@/lib/billing';
import { getOrCreateTrialSubscription } from '@/lib/subscription';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UpgradeToProButton } from '@/components/pricing/upgrade-to-pro-button';
import { ModeToggle } from '@/components/themes/toggle-dark-button';

export default async function PricingPage() {
  const session = await auth0.getSession();

  const subscription = session?.user
    ? await getOrCreateTrialSubscription(session.user.sub)
    : null;

  const effectivePlan = getEffectivePlan(subscription);

  return (
    <main className="min-h-screen bg-[#060812] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between">
          <Link href="/" className="leading-tight">
            <p className="text-sm font-semibold">ShipBud</p>
            <p className="text-xs text-slate-400">Plan, Develop, Reflect</p>
          </Link>

          <nav className="flex items-center gap-6 text-sm text-slate-300">
            <Link className="hover:text-white transition-colors" href="/pricing">
              Pricing
            </Link>

            {!session?.user ? (
              <Button asChild variant="outline">
                <Link href="/auth/login">Log in</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}

            <ModeToggle />
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold">Pricing</h1>
          <p className="mt-2 text-slate-400">
            Pro starts with a 30-day trial on your first login — no card required. Add a payment method anytime to keep Pro after your trial.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription className="text-slate-400">Great for trying ShipBud.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold">$0</p>
              <ul className="text-sm text-white/70 space-y-1">
                <li>1 project</li>
                <li>SDLC planning</li>
                <li>Journaling</li>
                <li>Docs generator</li>
              </ul>
              {!session?.user ? (
                <Button asChild variant="outline">
                  <Link href="/auth/login">Start free</Link>
                </Button>
              ) : effectivePlan === 'FREE' ? (
                <Button asChild variant="outline">
                  <Link href="/dashboard">Continue</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/settings/billing">
                    {subscription?.stripeCustomerId ? 'Manage billing' : 'Add payment method'}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription className="text-slate-400">Unlimited projects. $9 / month after your trial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold">$9</p>
              <ul className="text-sm text-white/70 space-y-1">
                <li>30-day free trial (no card required)</li>
                <li>Unlimited projects</li>
                <li>SDLC planning</li>
                <li>Journaling</li>
                <li>Docs generator</li>
              </ul>

              {!session?.user ? (
                <Button asChild>
                  <Link href="/auth/login">Log in to upgrade</Link>
                </Button>
              ) : effectivePlan === 'PRO' ? (
                <Button asChild variant="outline">
                  <Link href="/settings/billing">
                    {subscription?.stripeCustomerId ? 'Manage billing' : 'Add payment method'}
                  </Link>
                </Button>
              ) : (
                <UpgradeToProButton label="Add payment method" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-300">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <Link href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-10 text-xs text-slate-500">
          © {new Date().getFullYear()} ShipBud. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
