'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function AccountDangerZone() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function deleteAccount() {
        setIsDeleting(true);
        setError(null);

        const res = await fetch('/api/account', { method: 'DELETE' });

        if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? 'Failed to delete account.');
            setIsDeleting(false);
            return;
        }

        window.location.href = '/auth/logout';
    }

    return (
        <div className="space-y-3">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? 'Deleting…' : 'Delete account'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. Your ShipBud projects and data will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={deleteAccount}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting…' : 'Yes, delete account'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
    );
}
