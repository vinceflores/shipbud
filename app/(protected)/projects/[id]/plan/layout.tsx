import type { ReactNode } from "react";

import { PlanNav } from "./plan-nav";

export default async function PlanLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ id: string }>;
}) {
    const resolvedParams = await params;

    return (
        <div className="w-full space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Plan</h2>
                <p className="text-muted-foreground">
                    Manage your project plan, tasks, and milestones.
                </p>
            </div>

            <PlanNav params={resolvedParams} />

            <div>{children}</div>
        </div>
    );
}
