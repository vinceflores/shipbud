import { redirect } from 'next/navigation';

import { auth0 } from '@/lib/auth0';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountDangerZone } from '@/components/settings/account-danger-zone';

export default async function AccountSettingsPage() {
    const session = await auth0.getSession();

    if (!session?.user) {
        redirect('/auth/login');
    }

    const user = session.user;

    return (
        <div className="space-y-6">
            <Card className="border-white/10 bg-white/5">
                <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription className="text-slate-400">Basic account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-white/60">Name</span>
                        <span className="text-white/90">{user.name ?? '—'}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-white/60">Email</span>
                        <span className="text-white/70 break-all">{user.email ?? '—'}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-white/60">Last updated</span>
                        <span className="text-white/70">{new Date().toLocaleString()}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-destructive/30 bg-destructive/10 ring-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Delete your account and permanently remove your ShipBud data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AccountDangerZone />
                </CardContent>
            </Card>
        </div>
    );
}
