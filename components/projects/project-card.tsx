"use client";

import { useRouter } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ProjectCardProps = {
    project: {
        id: string;
        name: string;
        status: string;
    };
};

export function ProjectCard({ project }: ProjectCardProps) {
    const router = useRouter();

    return (
        <button
            type="button"
            className="block h-25 w-50 text-left"
            onClick={() => router.push(`/projects/${project.id}`)}
        >
            <Card className="h-full w-full rounded-lg cursor-pointer transition-colors hover:bg-white/5">
                <CardHeader className="h-full">
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription className="text-xs">{project.status}</CardDescription>
                </CardHeader>
            </Card>
        </button>
    );
}