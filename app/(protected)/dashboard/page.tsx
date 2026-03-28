import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import prisma from "@/lib/prisma";
import { isProSubscription } from "@/lib/billing";
import { getOrCreateTrialSubscription } from "@/lib/subscription";
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

  const subscription = await getOrCreateTrialSubscription(session.user.sub);

  const isPro = isProSubscription(subscription);
  const isAtFreeLimit = !isPro && projects.length >= 1;
  const now = new Date();
  const showTrialNotice =
    subscription?.plan === "PRO" &&
    subscription.status === "trialing" &&
    !subscription.stripeSubId &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt.getTime() > now.getTime();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Projects</h1>
      {showTrialNotice ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <p>
            Your 30-day Pro trial is active until{' '}
            <span className="font-medium text-white">{format(subscription.trialEndsAt!, 'PPP')}</span>.
          </p>
          <p className="mt-1 text-white/70">
            Add a payment method anytime in{' '}
            <Link href="/settings/billing" className="text-blue-300 hover:text-blue-200 underline underline-offset-4">
              billing settings
            </Link>
            .
          </p>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {isAtFreeLimit ? (
          <div className="h-25 w-50 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-800 px-4 py-6 text-center">
            <p className="text-sm text-white/70">Free plan: 1 project limit</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/billing">Upgrade to Pro</Link>
            </Button>
          </div>
        ) : (
          <div className="h-25 w-50 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-800">
            <Link href="/projects/new" className="mx-auto w-full text-center flex justify-center">
              <Plus /> New Project
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
