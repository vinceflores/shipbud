"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PlanNav({
    className,
    params,
    ...props
}: {
    className?: string;
    params: { id: string };
}) {
    const pathname = usePathname();
    const basePath = `/projects/${params.id}/plan`;

    const navigation = [
        { name: "Overview", href: basePath },
        { name: "Tasks", href: `${basePath}/tasks` },
        { name: "Milestones", href: `${basePath}/milestones` },
    ];

    return (
        <nav
            className={cn("flex space-x-4", className)}
            {...props}
        >
            {navigation.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md",
                        pathname === item.href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                >
                    {item.name}
                </Link>
            ))}
        </nav>
    );
}
