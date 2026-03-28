export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { format } from 'date-fns';

import { auth0 } from '@/lib/auth0';
import { stripe } from '@/lib/stripe';
import { getEffectivePlan } from '@/lib/billing';
import { getOrCreateTrialSubscription } from '@/lib/subscription';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BillingActions } from '@/components/settings/billing-actions';

function formatMoney(amountMinor: number | null | undefined, currency: string | null | undefined) {
    if (typeof amountMinor !== 'number' || !currency) return '—';

    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amountMinor / 100);
    } catch {
        return `${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
}

export default async function BillingSettingsPage() {
    const session = await auth0.getSession();
    if (!session?.user) {
        redirect('/auth/login');
    }

    const subscription = await getOrCreateTrialSubscription(session.user.sub);

    const effectivePlan = getEffectivePlan(subscription);

    const invoices = subscription?.stripeCustomerId
        ? await stripe.invoices.list({ customer: subscription.stripeCustomerId, limit: 10 })
        : null;

    return (
        <div className="space-y-6">
            <Card className="border-white/10 bg-white/5">
                <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription className="text-slate-400">Manage your plan and billing details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 text-white gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                            <p className="text-xs text-white/60">Current plan</p>
                            <p className="mt-1 text-lg font-semibold text-white">{effectivePlan}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                            <p className="text-xs text-white/60">Status</p>
                            <p className="mt-1 text-lg font-semibold">{subscription?.status ?? '—'}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                            <p className="text-xs text-white/60">Trial ends</p>
                            <p className="mt-1 text-sm text-white/80">
                                {subscription?.trialEndsAt ? format(subscription.trialEndsAt, 'PPP') : '—'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                            <p className="text-xs text-white/60">Current period end</p>
                            <p className="mt-1 text-sm text-white/80">
                                {subscription?.currentPeriodEnd ? format(subscription.currentPeriodEnd, 'PPP') : '—'}
                            </p>
                        </div>
                    </div>

                    <BillingActions
                        showUpgrade={effectivePlan === 'FREE'}
                        showAddPaymentMethod={effectivePlan === 'PRO' && !subscription?.stripeCustomerId}
                        showManageBilling={effectivePlan === 'PRO' && !!subscription?.stripeCustomerId}
                    />
                </CardContent>
            </Card>

            <Card className="border-white/10 text-white bg-white/5">
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                    <CardDescription className="text-slate-400">
                        Recent invoices from Stripe.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!invoices ? (
                        <p className="text-sm text-white/60">No invoices yet.</p>
                    ) : invoices.data.length === 0 ? (
                        <p className="text-sm text-white/60">No invoices found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-white/60 border-b border-white/10">
                                        <th className="py-2 pr-4 font-medium">Date</th>
                                        <th className="py-2 pr-4 font-medium">Amount</th>
                                        <th className="py-2 pr-4 font-medium">Status</th>
                                        <th className="py-2 font-medium">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.data.map((inv) => {
                                        const created = inv.created ? new Date(inv.created * 1000) : null;
                                        const amount =
                                            typeof inv.amount_paid === 'number' && inv.amount_paid > 0
                                                ? inv.amount_paid
                                                : inv.amount_due;

                                        return (
                                            <tr key={inv.id} className="border-b border-white/5">
                                                <td className="py-2 pr-4 text-white/80">
                                                    {created ? format(created, 'PPP') : '—'}
                                                </td>
                                                <td className="py-2 pr-4 text-white/80">
                                                    {formatMoney(amount, inv.currency)}
                                                </td>
                                                <td className="py-2 pr-4 text-white/70">{inv.status ?? '—'}</td>
                                                <td className="py-2">
                                                    {inv.hosted_invoice_url ? (
                                                        <a
                                                            href={inv.hosted_invoice_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-300 hover:text-blue-200 underline underline-offset-4"
                                                        >
                                                            View
                                                        </a>
                                                    ) : (
                                                        <span className="text-white/50">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
