// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const PHASE_SEQUENCE = ['PLANNING', 'DESIGN', 'DEV', 'TESTING', 'DEPLOY'] as const

type CreateProjectBody = {
  name?: unknown
  description?: unknown
  targetDate?: unknown
}

function parseCreateProjectBody(body: CreateProjectBody) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!name) {
    throw new Error('name is required')
  }

  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim()
      : null

  let targetDate: Date | null = null
  if (typeof body.targetDate === 'string' && body.targetDate.trim()) {
    const parsed = new Date(body.targetDate)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('targetDate must be a valid date string')
    }
    targetDate = parsed
  }

  return {
    name,
    description,
    targetDate,
  }
}

export async function POST(_req: Request) {
  try {
    const session = await auth0.getSession()

    if(!session) {
      return new Response("Unauthorized", {status: 401})
    }
    const body = (await _req.json()) as CreateProjectBody
    const parsedBody = parseCreateProjectBody(body)

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          ownerId: session.user.sub,
          name: parsedBody.name,
          description: parsedBody.description,
          targetDate: parsedBody.targetDate,
        },
      })

      const now = new Date()

      await tx.phase.createMany({
        data: PHASE_SEQUENCE.map((phaseType, index) => ({
          projectId: createdProject.id,
          type: phaseType,
          position: index,
          status: index === 0 ? 'ACTIVE' : 'LOCKED',
        })),
      })

      await tx.activityLog.create({
        data: {
          projectId: createdProject.id,
          lastActivityAt: now,
          lastActivityType: 'JOURNAL_ENTRY',
          events: {
            create: {
              type: 'JOURNAL_ENTRY',
              occurredAt: now,
              metadata: 'project_created',
            },
          },
        },
      })

      await tx.driftMonitor.create({
        data: {
          projectId: createdProject.id,
        },
      })

      return tx.project.findUnique({
        where: { id: createdProject.id },
        include: {
          phases: {
            orderBy: { position: 'asc' },
          },
          activityLog: true,
          driftMonitor: true,
        },
      })
    })

    if (!project) {
      return Response.json({ error: 'Project creation failed' }, { status: 500 })
    }

    return Response.json(project, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid project payload' },
      { status: 400 },
    )
  }
}

/**
 *  Get all projects for a user
 * @param _req 
 */
export async function GET() {

  try {
    const session = await auth0.getSession()
    if(!session) {
      return new Response("Unauthorized", {status: 401})
    }

    const projects = await prisma.project.findMany({
      where: {
        ownerId: session.user.sub
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return Response.json(projects)
  } catch {
    return Response.json({ error: 'Failed to load projects' }, { status: 500 })
  } 

}
