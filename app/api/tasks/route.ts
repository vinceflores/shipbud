
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ITEM_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const

type CreateTaskBody = {
  milestoneId?: unknown
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

    const body = (await _req.json()) as CreateTaskBody
    const milestoneId = typeof body.milestoneId === 'string' ? body.milestoneId : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''

    if (!milestoneId) {
      return Response.json({ error: 'milestoneId is required' }, { status: 400 })
    }
    if (!title) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    const status = body.status === undefined ? 'TODO' : body.status
    if (typeof status !== 'string' || !ITEM_STATUSES.includes(status as (typeof ITEM_STATUSES)[number])) {
      return Response.json({ error: 'status must be one of TODO, IN_PROGRESS, DONE' }, { status: 400 })
    }
    const parsedStatus = status as (typeof ITEM_STATUSES)[number]

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        phase: {
          project: {
            ownerId: session.user.sub,
          },
        },
      },
      select: { id: true },
    })

    if (!milestone) {
      return Response.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const createdTask = await prisma.$transaction(async (tx) => {
      const siblingCount = await tx.task.count({ where: { milestoneId } })
      const requestedPosition =
        body.position === undefined ? siblingCount : Math.min(toNonNegativeInt(body.position, 'position'), siblingCount)

      await tx.task.updateMany({
        where: {
          milestoneId,
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

      return tx.task.create({
        data: {
          milestoneId,
          title,
          status: parsedStatus,
          position: requestedPosition,
          source: 'USER',
        },
      })
    })

    return Response.json(createdTask, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid task payload' },
      { status: 400 },
    )
  }
}
