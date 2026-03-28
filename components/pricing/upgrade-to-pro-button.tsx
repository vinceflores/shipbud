'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function UpgradeToProButton({
    label = 'Upgrade to Pro',
    disabled,
}: {
    label?: string;
    disabled?: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function startCheckout() {
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

    return (
        <div className="space-y-2">
            <Button onClick={startCheckout} disabled={disabled || isLoading}>
                {isLoading ? 'Loading…' : label}
            </Button>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
    );
}
