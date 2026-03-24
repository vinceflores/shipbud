"use client";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { Spotlight } from "@/components/ui/spotlight";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Compass,
  Gauge,
  Github,
  ShieldCheck,
} from "lucide-react";
import LogoutButton from "@/components/auth0/LogoutButton";
import LoginButton from "@/components/auth0/LoginButton";
import { useUser } from "@auth0/nextjs-auth0";

export default function Home() {
  const { user, isLoading } = useUser();
  return (
    <main className="dark min-h-screen bg-[#060812] text-white relative overflow-hidden">
      <BackgroundBeams className="opacity-70" />
      <Spotlight className="left-1/2 top-[-20rem] h-[30rem] translate-x-[-50%]" />

      <header className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/60 to-violet-500/60 border border-white/[0.10] shadow-[0_0_50px_rgba(99,102,241,0.35)]" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">ShipBud</p>
              <p className="text-xs text-slate-400">Ship your build, fast</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-300">
            <a className="hover:text-white transition-colors" href="/pricing">
              Pricing
            </a>

            {!isLoading && (
              <div className="flex items-center justify-center gap-2">
                {!user ? (
                  <LoginButton />
                ) : (
                  <Button asChild>
                    <a href="/dashboard">Dashboard</a>
                  </Button>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto  max-w-7xl px-6 pt-16 pb-10">
          <HeroHighlight className="  p-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-6 p-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-xs text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                  Event-driven planning + shipping momentum
                </div>

                <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.05]">
                  Stop abandoning projects.
                  <span className="block">
                    <Highlight className="bg-clip-text text-transparent">
                      Start shipping them.
                    </Highlight>
                  </span>
                </h1>
              </div>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                ShipBud wraps your entire build process — from idea to shipped —
                and keeps you on track when momentum fades.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white border border-white/[0.10] rounded-2xl px-6 py-3"
                >
                  <a href="/auth/login">
                    Start building free <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>

                <a
                  href="/pricing"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.10] text-slate-200 hover:border-white/[0.18] hover:bg-white/[0.06] transition-colors"
                >
                  14-day free trial (no credit card)
                </a>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1">
                  Auth0-secured
                </span>
                <span className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1">
                  Prisma Postgres
                </span>
                <span className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1">
                  Featherless AI
                </span>
                <span className="rounded-full border border-white/[0.10] bg-white/[0.03] px-3 py-1">
                  Stripe billing
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl border border-white/[0.10] bg-white/[0.04] backdrop-blur-xl shadow-[0_0_80px_rgba(99,102,241,0.18)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
                <div className="p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-200">
                      Build status at a glance
                    </div>
                    <div className="text-xs text-slate-400">Live momentum</div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Gauge className="w-4 h-4 text-blue-300" />
                        SDLC Planner
                      </div>
                      <p className="mt-2 text-2xl font-semibold">Phase-ready</p>
                      <p className="text-xs text-slate-400 mt-1">
                        AI guidance to milestones to tasks
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <BookOpen className="w-4 h-4 text-violet-300" />
                        Build Journal
                      </div>
                      <p className="mt-2 text-2xl font-semibold">
                        Momentum kept
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Auto-drafts + explicit confirm
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Compass className="w-4 h-4 text-blue-300" />
                        Drift Detection
                      </div>
                      <p className="mt-2 text-2xl font-semibold">
                        No silent stalls
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        N8N checks DEV+ activity
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.10] bg-black/20 p-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Bot className="w-4 h-4 text-violet-300" />
                        Content Generation
                      </div>
                      <p className="mt-2 text-2xl font-semibold">
                        Ship your story
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Twitter, README, obstacles
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/[0.10] bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/50 to-violet-500/50 border border-white/[0.10] flex items-center justify-center">
                        <Compass className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">
                          <Highlight>
                            ShipBud is designed to keep you moving.
                          </Highlight>
                        </p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Planning and gating happen on the server; automation
                          and webhooks drive the rest.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-blue-500/15 blur-2xl" />
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-violet-500/15 blur-2xl" />
            </div>
          </HeroHighlight>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="w-full lg:w-1/2">
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                The problem: your ideas stall before shipping.
              </h2>
              <p className="text-slate-300 mt-3 leading-relaxed">
                ShipBud is built to turn “next steps” into momentum — and keep
                it going.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full lg:w-1/2">
              <div className="rounded-3xl border border-white/[0.10] bg-white/[0.03] p-5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-white/[0.10] flex items-center justify-center">
                  <Compass className="w-5 h-5 text-blue-300" />
                </div>
                <h3 className="mt-4 font-semibold">I start but never finish</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  A structured SDLC planner keeps your next actions clear.
                </p>
              </div>

              <div className="rounded-3xl border border-white/[0.10] bg-white/[0.03] p-5">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-white/[0.10] flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-violet-300" />
                </div>
                <h3 className="mt-4 font-semibold">I lose momentum</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Drift detection watches activity and nudges before you stall.
                </p>
              </div>

              <div className="rounded-3xl border border-white/[0.10] bg-white/[0.03] p-5">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.10] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-slate-200" />
                </div>
                <h3 className="mt-4 font-semibold">Nobody sees what I build</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Content generation helps you ship and tell the story.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                How it works
              </h2>
              <p className="text-slate-300 mt-3 leading-relaxed">
                A simple loop: describe, build, ship. ShipBud handles the
                structure and automations.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  n: "01",
                  title: "Describe your idea",
                  body: "Set the goal and scope. ShipBud starts your planning skeleton.",
                },
                {
                  n: "02",
                  title: "Build with AI guidance",
                  body: "Generate an SDLC plan, then break it down into milestones and tasks.",
                },
                {
                  n: "03",
                  title: "Ship + tell the story",
                  body: "Journal progress, detect drift, and generate shareable content.",
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="rounded-3xl border border-white/[0.10] bg-white/[0.03] p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-xs font-semibold text-slate-300 rounded-full border border-white/[0.10] bg-black/20 px-3 py-1">
                      {s.n}
                    </div>
                    <h3 className="font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                Feature highlights
              </h2>
              <p className="text-slate-300 mt-3 leading-relaxed">
                Everything you need to plan, ship, and stay on track.
              </p>
            </div>
            <a
              href="/auth/login"
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="mt-8">
            <BentoGrid className="max-w-none">
              <BentoGridItem
                title="SDLC Planner"
                description="Turn ideas into phase + milestone + task structure."
                icon={<Compass className="w-5 h-5 text-blue-300" />}
              />
              <BentoGridItem
                title="Build Journal"
                description="Track obstacles and wins with user-confirmed drafts."
                icon={<BookOpen className="w-5 h-5 text-violet-300" />}
              />
              <BentoGridItem
                title="Drift Detection"
                description="Server-checked momentum monitoring via n8n."
                icon={<Gauge className="w-5 h-5 text-blue-300" />}
              />
              <BentoGridItem
                title="Content Generation"
                description="Pro-gated drafts for Twitter, README, and obstacles."
                icon={<Bot className="w-5 h-5 text-violet-300" />}
              />
            </BentoGrid>
          </div>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                Demo video
              </h2>
              <p className="text-slate-300 mt-3 leading-relaxed">
                Placeholder until your Day 28 recording. The UI will mirror the
                flow in the design doc.
              </p>
            </div>
            <div className="rounded-3xl border border-white/[0.10] bg-white/[0.03] p-5">
              <div className="aspect-video w-full rounded-2xl border border-white/[0.10] bg-black/20 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm font-semibold">Demo placeholder</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Embed YouTube or a direct MP4 when ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em]">
                Pricing
              </h2>
              <p className="text-slate-300 mt-3 leading-relaxed">
                Start with a free trial, upgrade when your momentum sticks.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/[0.10] bg-white/[0.03] p-7">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Free Trial</h3>
                <span className="text-xs px-3 py-1 rounded-full border border-white/[0.10] text-slate-200 bg-black/20">
                  14 days
                </span>
              </div>
              <p className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
                $0
              </p>
              <p className="text-slate-400 text-sm mt-2">
                No credit card required. After the trial, gated features are
                disabled.
              </p>

              <div className="mt-6 space-y-3 text-sm">
                {[
                  "1 project",
                  "Enabled drift detection",
                  "Enabled content generation",
                  "Todoist sync later",
                ].map((t) => (
                  <div
                    key={t}
                    className="flex items-center gap-2 text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-400/20 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                    </span>
                    {t}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  asChild
                  className="w-full rounded-2xl bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.10] text-white"
                >
                  <a href="/auth/login">
                    Start building free <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.14] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-blue-500/25 to-violet-500/25 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Pro</h3>
                  <span className="text-xs px-3 py-1 rounded-full border border-violet-400/25 text-violet-200 bg-violet-500/10">
                    $9 / month
                  </span>
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
                  $9
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Unlock unlimited projects and pro-gated features.
                </p>

                <div className="mt-6 space-y-3 text-sm">
                  {[
                    "Unlimited projects",
                    "Enabled drift detection",
                    "Enabled content generation",
                    "Todoist sync",
                  ].map((t) => (
                    <div
                      key={t}
                      className="flex items-center gap-2 text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                      </span>
                      {t}
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Button
                    asChild
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white border border-white/[0.10]"
                  >
                    <a href="/pricing">
                      Upgrade to Pro <ArrowRight className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.10]">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Built with</p>
            <p className="text-slate-400 text-sm mt-1">
              Next.js, Auth0, n8n, Prisma, Featherless AI
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-300">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a href="/pricing" className="hover:text-white transition-colors">
              Pricing
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-10 text-xs text-slate-500">
          © {new Date().getFullYear()} ShipBud. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
