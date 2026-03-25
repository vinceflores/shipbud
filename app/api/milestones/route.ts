// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ITEM_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const

type CreateMilestoneBody = {
  phaseId?: unknown
  title?: unknown
  status?: unknown
  position?: unknown
}

function toNonNegativeInt(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`)
  }
  return value
}

export async function POST(_req: Request) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = (await _req.json()) as CreateMilestoneBody
    const phaseId = typeof body.phaseId === 'string' ? body.phaseId : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!phaseId) {
      return Response.json({ error: 'phaseId is required' }, { status: 400 })
    }
    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    const status = body.status === undefined ? 'TODO' : body.status
    if (typeof status !== 'string' || !ITEM_STATUSES.includes(status as (typeof ITEM_STATUSES)[number])) {
      return Response.json({ error: 'status must be one of TODO, IN_PROGRESS, DONE' }, { status: 400 })
    }
    const parsedStatus = status as (typeof ITEM_STATUSES)[number]

    const phase = await prisma.phase.findFirst({
      where: {
        id: phaseId,
        project: {
          ownerId: session.user.sub,
        },
      },
      select: { id: true },
    })

    if (!phase) {
      return Response.json({ error: 'Phase not found' }, { status: 404 })
    }

    const createdMilestone = await prisma.$transaction(async (tx) => {
      const siblingCount = await tx.milestone.count({ where: { phaseId } })
      const requestedPosition =
        body.position === undefined ? siblingCount : Math.min(toNonNegativeInt(body.position, 'position'), siblingCount)

      await tx.milestone.updateMany({
        where: {
          phaseId,
          position: {
            gte: requestedPosition,
          },
        },
        data: {
          position: {
            increment: 1,
          },
        },
      })

      return tx.milestone.create({
        data: {
          phaseId,
          title,
          status: parsedStatus,
          position: requestedPosition,
          source: 'USER',
        },
      })
    })

    return Response.json(createdMilestone, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid milestone payload' },
      { status: 400 },
    )
  }
}
