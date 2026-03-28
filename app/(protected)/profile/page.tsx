// src/app/profile/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { auth0 } from '@/lib/auth0';
import ProfileContent from '@/components/auth0/profile/profile-content';

export default async function ProfilePage() {
    const session = await auth0.getSession();

    if (!session || !session.user) {
        redirect('/auth/login');
    }

    return (
        <div className="min-h-full bg-white/5">
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
                    <p className="text-white/70">View your account information</p>
                </div>

                <Suspense
                    fallback={
                        <div className="flex items-center justify-center min-h-100">
                            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                        </div>
                    }
                >
                    <ProfileContent user={session.user} />
                </Suspense>
            </div>
        </div>
    );
}