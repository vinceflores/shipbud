import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import prisma from "@/lib/prisma";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId: session.user.sub,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <div className="mt-6 flex flex-wrap gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        <div
          className="h-25 w-50 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-800"
        >
          <Link href="/projects/new" className="mx-auto w-full text-center flex justify-center">
            <Plus /> New Project
          </Link>
        </div>
      </div>
    </main>
  );
}
