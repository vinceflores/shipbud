"use client"
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project } from "@/app/generated/prisma/client";
import { useUser } from "@auth0/nextjs-auth0";
import LogoutButton from "@/components/auth0/LogoutButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import UserButton from "@/components/auth0/user-button";

const routes = [
  { href: "/projects", label: "projects" }
]
export default function DashboardPage() {
  const { user } = useUser()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | []>([])

  useEffect(() => {
    const fet = async () => {
      console.log("fetch ran")
      const res = await fetch("/api/projects")
      if (res.ok) {
        const projs = await res.json()
        setProjects(projs)
      }
    }
    fet()
  }
    , [])

  if (!user) return <div>
    <Button asChild>
      <a href="/auth/login">log in</a>
    </Button>
  </div>

  return (
    <main className="min-h-screen bg-[#060812] text-white px-6 py-12 dark">
      <nav>
        <LogoutButton />
        <UserButton user={user} />
      </nav>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-slate-400 mt-2">
        Placeholder page. API + UI integration comes next.
      </p>
      {user.sub}
      <div className="flex flex-wrap gap-4 p-4 ">
        {
          projects.length > 0 && projects.map(
            (i, k) => (
              <Card key={k} className="w-[200px]"
                onClick={() => router.push(`/projects/${i.id}`)}
              >
                <CardHeader>
                  <CardTitle className="">{i.name}</CardTitle>
                  <CardDescription className="text-xs">{i.status}</CardDescription>
                </CardHeader>
              </Card>
            )
          )
        }
        <Button onClick={() => router.push("/projects/new")} className="border-2 border-dashed border-gray-800 h-[100px] aspect-video w-[200px]" variant={"ghost"} > <Plus /> New Project </Button>
      </div>

    </main>
  );
}
