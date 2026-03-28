// src/components/auth0/profile/profile-content.tsx
'use client';

import UserInfoCard from './user-info-card';

interface KeyValueMap {
    [key: string]: any;
}

export default function ProfileContent({ user }: { user: KeyValueMap }) {
    return (
        <div className="grid grid-cols-1 gap-6">
            <div className="lg:col-span-1 max-w-2xl">
                <UserInfoCard user={user} />
            </div>
        </div>
    );
}