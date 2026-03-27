"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Repo = {
    githubRepoUrl: string;
    webhookId: string;
};

type ProjectDetail = {
    id: string;
    name: string;
    repo: Repo | null;
};

export default function ProjectGitHubPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [repoUrl, setRepoUrl] = useState("");
    const [webhookSecret, setWebhookSecret] = useState("");
    const [isConnectingRepo, setIsConnectingRepo] = useState(false);

    const loadProject = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
            const payload = (await res.json().catch(() => null)) as { error?: string } | null;
            const message = payload?.error ?? "Failed to load project.";
            setError(message);
            toast.error(message);
            setIsLoading(false);
            return;
        }

        const data = (await res.json()) as ProjectDetail;
        setProject(data);
        setRepoUrl(data.repo?.githubRepoUrl ?? "");
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        void loadProject();
    }, [loadProject]);

    async function connectRepo() {
        if (!repoUrl.trim()) {
            toast.error("Repository URL is required.");
            return;
        }

        setIsConnectingRepo(true);

        const res = await fetch(`/api/projects/${id}/repo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                githubRepoUrl: repoUrl.trim(),
                webhookSecret: webhookSecret.trim() || undefined,
            }),
        });

        if (!res.ok) {
            const payload = (await res.json().catch(() => null)) as { error?: string; details?: string } | null;
            toast.error(payload?.error ?? "Failed to connect repository.");
            setIsConnectingRepo(false);
            return;
        }

        toast.success("Repository connected and webhook registered.");
        await loadProject();
        setIsConnectingRepo(false);
    }

    if (isLoading) {
        return <div className="text-white">Loading project...</div>;
    }

    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-white">{project?.name}</h1>
                <p className="mt-1 text-sm text-slate-400">Connect and manage GitHub repository</p>
            </div>

            <Card className="border-white/10 bg-white/5">
                <CardHeader>
                    <CardTitle>Repository Connection</CardTitle>
                    <CardDescription className="text-slate-400">Connect GitHub and register project webhooks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm">GitHub Repository URL</label>
                        <input
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/owner/repo"
                            className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm">Webhook Secret (optional)</label>
                        <input
                            value={webhookSecret}
                            onChange={(e) => setWebhookSecret(e.target.value)}
                            placeholder="Use env default when empty"
                            className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm text-white"
                        />
                    </div>

                    {project?.repo ? (
                        <p className="text-xs text-slate-400">Connected webhook id: {project.repo.webhookId}</p>
                    ) : null}

                    <Button onClick={connectRepo} disabled={isConnectingRepo}>
                        {isConnectingRepo ? "Connecting..." : "Connect GitHub Repo"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
