import type { ReactNode } from 'react';

import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export default function SettingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#060812] text-white">
            <div className="mx-auto w-full max-w-7xl px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="mt-2 text-slate-400">Manage your account and billing.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-[16rem_1fr]">
                    <SettingsSidebar />
                    <div className="min-w-0">{children}</div>
                </div>
            </div>
        </div>
    );
}
