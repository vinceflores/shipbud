"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkdownEditor } from "@/components/ui/markdown-editor";


type CreateProjectResponse = {
  id: string;
  name: string;
};

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      targetDate: targetDate || null,
    };

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Failed to create project.");
      setIsSubmitting(false);
      return;
    }

    const project = (await res.json()) as CreateProjectResponse;
    router.push(`/projects/${project.id}`);
  }

  return (
    <main className="min-h-screen bg-[#060812] text-white px-6 py-12 dark">
      <div className="mx-auto w-full max-w-2xl">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-xl">Create Project</CardTitle>
            <CardDescription className="text-slate-400">
              Add a new project to start planning and tracking progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ShipBud launch"
                  required
                  className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Description (optional)
                </label>
                <MarkdownEditor
                  id="description"
                  value={description}
                  onChange={setDescription}
                  placeholder="What are you building?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="targetDate" className="block text-sm font-medium">
                  Target date (optional)
                </label>
                <input
                  id="targetDate"
                  name="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-[#0d1224] px-3 py-2 text-sm outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20"
                />
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create project"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/dashboard")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
