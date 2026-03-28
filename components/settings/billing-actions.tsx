'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function BillingActions({
    showUpgrade,
    showAddPaymentMethod,
    showManageBilling,
    upgradeLabel = 'Upgrade to Pro',
}: {
    showUpgrade: boolean;
    showAddPaymentMethod: boolean;
    showManageBilling: boolean;
    upgradeLabel?: string;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleUpgrade() {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/stripe/checkout', { method: 'POST' });
        if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? 'Failed to start checkout.');
            setIsLoading(false);
            return;
        }

        const data = (await res.json()) as { url: string };
        window.location.href = data.url;
    }

    async function handleManageBilling() {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/stripe/portal', { method: 'GET' });
        if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? 'Failed to open billing portal.');
            setIsLoading(false);
            return;
        }

        const data = (await res.json()) as { url: string };
        window.location.href = data.url;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                {showUpgrade ? (
                    <Button onClick={handleUpgrade} disabled={isLoading}>
                        {isLoading ? 'Loading…' : upgradeLabel}
                    </Button>
                ) : null}
                {showAddPaymentMethod ? (
                    <Button variant="outline" onClick={handleUpgrade} disabled={isLoading}>
                        {isLoading ? 'Loading…' : 'Add payment method'}
                    </Button>
                ) : null}
                {showManageBilling ? (
                    <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
                        {isLoading ? 'Loading…' : 'Manage billing'}
                    </Button>
                ) : null}
            </div>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
    );
}
