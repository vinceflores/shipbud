// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

type PlannedMilestone = {
  title: string
  tasks: string[]
}

type PlannedPhase = {
  phaseType: 'PLANNING' | 'DESIGN' | 'DEV' | 'TESTING' | 'DEPLOY'
  milestones: PlannedMilestone[]
}

function buildDefaultPlan(projectName: string): PlannedPhase[] {
  return [
    {
      phaseType: 'PLANNING',
      milestones: [
        {
          title: `Define scope for ${projectName}`,
          tasks: ['List must-have features', 'Capture success metrics', 'Identify top risks'],
        },
        {
          title: 'Create execution roadmap',
          tasks: ['Break down work into vertical slices', 'Estimate complexity by slice', 'Set release checkpoints'],
        },
      ],
    },
    {
      phaseType: 'DESIGN',
      milestones: [
        {
          title: 'Design user and system flows',
          tasks: ['Map primary user journeys', 'Define API contracts', 'Document data relationships'],
        },
        {
          title: 'Finalize architecture',
          tasks: ['Select integration boundaries', 'Define observability baseline', 'Approve implementation plan'],
        },
      ],
    },
    {
      phaseType: 'DEV',
      milestones: [
        {
          title: 'Implement core capabilities',
          tasks: ['Build core API endpoints', 'Implement persistence logic', 'Add auth and ownership checks'],
        },
        {
          title: 'Integrate external systems',
          tasks: ['Connect third-party services', 'Handle retries and failures', 'Log high-value events'],
        },
      ],
    },
    {
      phaseType: 'TESTING',
      milestones: [
        {
          title: 'Validate behavior and edge cases',
          tasks: ['Write happy-path tests', 'Write authorization tests', 'Validate failure responses'],
        },
        {
          title: 'Harden reliability',
          tasks: ['Load-test key workflows', 'Verify webhook idempotency', 'Fix regressions from tests'],
        },
      ],
    },
    {
      phaseType: 'DEPLOY',
      milestones: [
        {
          title: 'Prepare production launch',
          tasks: ['Document release checklist', 'Verify env configuration', 'Run smoke tests in staging'],
        },
        {
          title: 'Ship and monitor',
          tasks: ['Deploy production release', 'Track first 24h metrics', 'Create follow-up improvements'],
        },
      ],
    },
  ]
}

function toSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
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
  const project = await prisma.project.findFirst({
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
  })

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  const plan = buildDefaultPlan(project.name)
  const planByType = new Map(plan.map((phase) => [phase.phaseType, phase]))

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

      for (let milestonePosition = 0; milestonePosition < planned.milestones.length; milestonePosition += 1) {
        const milestone = planned.milestones[milestonePosition]

        const createdMilestone = await tx.milestone.create({
          data: {
            phaseId: phase.id,
            title: milestone.title,
            source: 'AI',
            position: milestonePosition,
          },
        })

        if (milestone.tasks.length > 0) {
          await tx.task.createMany({
            data: milestone.tasks.map((task, taskPosition) => ({
              milestoneId: createdMilestone.id,
              title: task,
              source: 'AI',
              position: taskPosition,
            })),
          })
        }
      }
    }
  })

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()

      controller.enqueue(encoder.encode(toSseEvent('started', { projectId: project.id })))

      for (const phase of plan) {
        controller.enqueue(
          encoder.encode(
            toSseEvent('phase', {
              phaseType: phase.phaseType,
              milestones: phase.milestones,
            }),
          ),
        )
      }

      controller.enqueue(
        encoder.encode(
          toSseEvent('completed', {
            projectId: project.id,
            phases: plan.length,
          }),
        ),
      )
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
