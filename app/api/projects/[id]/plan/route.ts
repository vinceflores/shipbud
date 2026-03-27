// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'
import { PlanAgent } from '@/lib/sdlc/plan-agent'

type PlannedMilestone = { title: string; tasks: string[] }
type PlannedPhase = {
  phaseType: 'PLANNING' | 'DESIGN' | 'DEV' | 'TESTING' | 'DEPLOY'
  milestones: PlannedMilestone[]
}

function isLikelyPrismaUpstreamError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('Failed to connect to upstream database') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT')
  )
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth0.getSession()

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await context.params
  const projectQuery = {
    where: {
      id,
      ownerId: session.user.sub,
    },
    include: {
      phases: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  } as const

  type ProjectWithPhases = Awaited<ReturnType<typeof prisma.project.findFirst<typeof projectQuery>>>

  let project: ProjectWithPhases
  try {
    project = await prisma.project.findFirst(projectQuery)
  } catch (error) {
    if (isLikelyPrismaUpstreamError(error)) {
      return Response.json(
        { error: 'Database unavailable. Please try again in a moment.' },
        { status: 503 },
      )
    }
    throw error
  }

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  // Ensure the 5 standard phases exist.
  const phaseOrder: Array<PlannedPhase['phaseType']> = ['PLANNING', 'DESIGN', 'DEV', 'TESTING', 'DEPLOY']
  const existingTypes = new Set(project.phases.map((p) => p.type))
  if (phaseOrder.some((t) => !existingTypes.has(t))) {
    try {
      await prisma.$transaction(async (tx) => {
        for (let position = 0; position < phaseOrder.length; position += 1) {
          const type = phaseOrder[position]
          if (existingTypes.has(type)) continue
          await tx.phase.create({
            data: {
              projectId: project.id,
              type,
              position,
              status: 'ACTIVE',
            },
          })
        }
      })
    } catch (error) {
      if (isLikelyPrismaUpstreamError(error)) {
        return Response.json(
          { error: 'Database unavailable. Please try again in a moment.' },
          { status: 503 },
        )
      }
      throw error
    }

    // Re-fetch project with phases.
    let refreshed: ProjectWithPhases
    try {
      refreshed = await prisma.project.findFirst({
        where: { id: project.id, ownerId: session.user.sub },
        include: { phases: { orderBy: { position: 'asc' } } },
      })
    } catch (error) {
      if (isLikelyPrismaUpstreamError(error)) {
        return Response.json(
          { error: 'Database unavailable. Please try again in a moment.' },
          { status: 503 },
        )
      }
      throw error
    }
    if (!refreshed) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }
    project.phases = refreshed.phases
  }

  let designDocMarkdown: string | undefined
  let rtmMarkdown: string | undefined
  let testsMarkdown: string | undefined

  try {
    const [designDoc, rtmDoc, testsDoc, sdlc] = await prisma.$transaction([
      prisma.projectDesignDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
      prisma.projectRtmDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
      prisma.projectTestsDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
      prisma.projectSdlcState.findUnique({ where: { projectId: project.id }, select: { state: true } }),
    ])

    // Preferred: normalized doc tables.
    designDocMarkdown = designDoc?.markdown
    rtmMarkdown = rtmDoc?.markdown
    testsMarkdown = testsDoc?.markdown

    // Fallback: legacy JSON state for older rows not yet backfilled.
    if (!designDocMarkdown || !rtmMarkdown || !testsMarkdown) {
      const state = (sdlc?.state ?? null) as any
      designDocMarkdown = designDocMarkdown ?? state?.design?.tabContents?.['design-doc']
      rtmMarkdown = rtmMarkdown ?? state?.design?.tabContents?.rtm
      testsMarkdown = testsMarkdown ?? state?.tests?.tabContents?.tests
    }
  } catch (error) {
    if (isLikelyPrismaUpstreamError(error)) {
      return Response.json(
        { error: 'Database unavailable. Please try again in a moment.' },
        { status: 503 },
      )
    }
    throw error
  }

  if (
    typeof designDocMarkdown !== 'string' ||
    typeof rtmMarkdown !== 'string' ||
    typeof testsMarkdown !== 'string' ||
    !designDocMarkdown.trim() ||
    !rtmMarkdown.trim() ||
    !testsMarkdown.trim()
  ) {
    return Response.json(
      {
        error:
          'Missing SDLC docs. Fill in Design Doc, RTM, and Tests before generating milestones & tasks.',
      },
      { status: 400 },
    )
  }

  const generated = await PlanAgent({
    projectName: project.name,
    designDocMarkdown,
    rtmMarkdown,
    testsMarkdown,
  })

  const plan: PlannedPhase[] = generated.phases.map((p) => ({
    phaseType: p.phaseType,
    milestones: p.milestones.map((m) => ({
      title: m.title,
      tasks: m.tasks.map((t) => t.title),
    })),
  }))

  const planByType = new Map(plan.map((phase) => [phase.phaseType, phase]))

  let milestonesCreated = 0
  let tasksCreated = 0

  try {
    await prisma.$transaction(async (tx) => {
      await tx.milestone.deleteMany({
        where: {
          phase: {
            projectId: project.id,
          },
          source: 'AI',
        },
      })

      for (const phase of project.phases) {
        const planned = planByType.get(phase.type)
        if (!planned) {
          continue
        }

        for (
          let milestonePosition = 0;
          milestonePosition < planned.milestones.length;
          milestonePosition += 1
        ) {
          const milestone = planned.milestones[milestonePosition]

          const createdMilestone = await tx.milestone.create({
            data: {
              phaseId: phase.id,
              title: milestone.title,
              source: 'AI',
              position: milestonePosition,
            },
          })
          milestonesCreated += 1

          if (milestone.tasks.length > 0) {
            await tx.task.createMany({
              data: milestone.tasks.map((task, taskPosition) => ({
                milestoneId: createdMilestone.id,
                title: task,
                source: 'AI',
                position: taskPosition,
              })),
            })
            tasksCreated += milestone.tasks.length
          }
        }
      }
    })
  } catch (error) {
    if (isLikelyPrismaUpstreamError(error)) {
      return Response.json(
        { error: 'Database unavailable. Please try again in a moment.' },
        { status: 503 },
      )
    }
    throw error
  }

  return Response.json({
    ok: true,
    projectId: project.id,
    summary: generated.summary,
    counts: {
      phases: plan.length,
      milestones: milestonesCreated,
      tasks: tasksCreated,
    },
  })
}
