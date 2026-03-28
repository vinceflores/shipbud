'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const SETTINGS_NAV_ITEMS = [
    { href: '/settings/billing', label: 'Subscription & Billing' },
    { href: '/settings/account', label: 'Account Settings' },
] as const;

export function SettingsSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full md:w-64 shrink-0">
            <nav className="space-y-1">
                {SETTINGS_NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'block rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                                    : 'text-white/70 hover:text-white/90 hover:bg-white/5 border border-transparent',
                            )}
                        >
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
