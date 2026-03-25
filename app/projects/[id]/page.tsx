"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { toast } from "sonner";
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
} from "@/components/ui/alert-dialog";

type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

type Repo = {
  githubRepoUrl: string;
  webhookId: string;
};

type Task = {
  id: string;
};

type Milestone = {
  id: string;
  tasks: Task[];
};

type Phase = {
  id: string;
  type: string;
  milestones: Milestone[];
};

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: ProjectStatus;
  repo: Repo | null;
  phases: Phase[];
};

function toDateInput(dateString: string | null) {
  if (!dateString) {
    return "";
  }
  return dateString.slice(0, 10);
}

export default function ProjectOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("ACTIVE");
  const [isSaving, setIsSaving] = useState(false);

  const [repoUrl, setRepoUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isConnectingRepo, setIsConnectingRepo] = useState(false);

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planEvents, setPlanEvents] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalMilestones = useMemo(
    () => project?.phases.reduce((count, phase) => count + phase.milestones.length, 0) ?? 0,
    [project],
  );
  const totalTasks = useMemo(
    () =>
      project?.phases.reduce(
        (count, phase) => count + phase.milestones.reduce((taskCount, milestone) => taskCount + milestone.tasks.length, 0),
        0,
      ) ?? 0,
    [project],
  );

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
    setName(data.name);
    setDescription(data.description ?? "");
    setTargetDate(toDateInput(data.targetDate));
    setStatus(data.status);
    setRepoUrl(data.repo?.githubRepoUrl ?? "");
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  async function saveProject() {
    if (!name.trim()) {
      const message = "Name is required.";
      setError(message);
      toast.error(message);
      return;
    }

    setIsSaving(true);
    setError(null);

    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        targetDate: targetDate || null,
        status,
      }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      const message = payload?.error ?? "Failed to update project.";
      setError(message);
      toast.error(message);
      setIsSaving(false);
      return;
    }

    await loadProject();
    toast.success("Project updated.");
    setIsSaving(false);
  }

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

  async function generatePlan() {
    setIsGeneratingPlan(true);
    setPlanEvents([]);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}/plan`, { method: "POST" });

      if (!res.ok || !res.body) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        const message = payload?.error ?? "Failed to generate plan.";
        setError(message);
        toast.error(message);
        setIsGeneratingPlan(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const eventLine = chunk
            .split("\n")
            .find((line) => line.startsWith("event:"));
          if (eventLine) {
            const eventName = eventLine.replace("event:", "").trim();
            setPlanEvents((prev) => [...prev, eventName]);
          }
        }
      }

      await loadProject();
      toast.success("Plan generated.");
      router.push(`/projects/${id}/plan`);
    } catch {
      const message = "Failed to stream plan generation.";
      setError(message);
      toast.error(message);
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function deleteProject() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        const message = payload?.error ?? "Failed to delete project.";
        setError(message);
        toast.error(message);
        setIsDeleting(false);
        return;
      }

      toast.success("Project deleted.");
      router.push("/dashboard");
    } catch {
      const message = "Failed to delete project.";
      setError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <main className="min-h-screen bg-[#060812] px-6 py-12 text-white">Loading project...</main>;
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#060812] px-6 py-12 text-white">
        <p className="text-red-300">{error ?? "Project not found."}</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060812] px-6 py-12 text-white dark">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {project.status} · {totalMilestones} milestones · {totalTasks} tasks
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${id}/plan`}>Open Plan</Link>
            </Button>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Project Settings</CardTitle>
            <CardDescription className="text-slate-400">Update metadata and current lifecycle status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Description</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                placeholder="Write a project summary in markdown..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm md:w-72"
              />
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <Button onClick={saveProject} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

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
                className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Webhook Secret (optional)</label>
              <input
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Use env default when empty"
                className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm"
              />
            </div>

            {project.repo ? (
              <p className="text-xs text-slate-400">Connected webhook id: {project.repo.webhookId}</p>
            ) : null}

            <Button onClick={connectRepo} disabled={isConnectingRepo}>
              {isConnectingRepo ? "Connecting..." : "Connect GitHub Repo"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Plan Generation</CardTitle>
            <CardDescription className="text-slate-400">Trigger AI SDLC planning and stream progress events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={generatePlan} disabled={isGeneratingPlan}>
              {isGeneratingPlan ? "Generating..." : "Generate Plan"}
            </Button>

            {planEvents.length > 0 ? (
              <div className="rounded-md border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                {planEvents.join(" -> ")}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/10 ring-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Delete this project and all related data, including phases, milestones, tasks, repo connections, and logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Project"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All project data will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={deleteProject} disabled={isDeleting}>
                    {isDeleting ? "Deleting..." : "Yes, delete project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
