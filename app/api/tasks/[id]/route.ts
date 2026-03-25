// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ITEM_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const

type PatchTaskBody = {
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

function parsePatchBody(body: PatchTaskBody) {
  const data: {
    title?: string
    status?: (typeof ITEM_STATUSES)[number]
    position?: number
  } = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw new Error('title must be a non-empty string')
    }
    data.title = body.title.trim()
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ITEM_STATUSES.includes(body.status as (typeof ITEM_STATUSES)[number])) {
      throw new Error('status must be one of TODO, IN_PROGRESS, DONE')
    }
    data.status = body.status as (typeof ITEM_STATUSES)[number]
  }

  if (body.position !== undefined) {
    data.position = toNonNegativeInt(body.position, 'position')
  }

  if (Object.keys(data).length === 0) {
    throw new Error('No updatable fields provided')
  }

  return data
}

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await context.params
    const task = await prisma.task.findFirst({
      where: {
        id,
        milestone: {
          phase: {
            project: {
              ownerId: session.user.sub,
            },
          },
        },
      },
      select: {
        id: true,
        milestoneId: true,
        position: true,
      },
    })

    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = (await _req.json()) as PatchTaskBody
    const parsed = parsePatchBody(body)

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: {
        title?: string
        status?: (typeof ITEM_STATUSES)[number]
        position?: number
      } = {}

      if (parsed.title !== undefined) {
        updateData.title = parsed.title
      }
      if (parsed.status !== undefined) {
        updateData.status = parsed.status
      }

      if (parsed.position !== undefined) {
        const siblingCount = await tx.task.count({ where: { milestoneId: task.milestoneId } })
        const maxPosition = Math.max(0, siblingCount - 1)
        const targetPosition = Math.min(parsed.position, maxPosition)

        if (targetPosition < task.position) {
          await tx.task.updateMany({
            where: {
              milestoneId: task.milestoneId,
              position: {
                gte: targetPosition,
                lt: task.position,
              },
            },
            data: {
              position: {
                increment: 1,
              },
            },
          })
        } else if (targetPosition > task.position) {
          await tx.task.updateMany({
            where: {
              milestoneId: task.milestoneId,
              position: {
                gt: task.position,
                lte: targetPosition,
              },
            },
            data: {
              position: {
                decrement: 1,
              },
            },
          })
        }

        updateData.position = targetPosition
      }

      return tx.task.update({
        where: { id },
        data: updateData,
      })
    })

    return Response.json(updated)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid task payload' },
      { status: 400 },
    )
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth0.getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await context.params
  const task = await prisma.task.findFirst({
    where: {
      id,
      milestone: {
        phase: {
          project: {
            ownerId: session.user.sub,
          },
        },
      },
    },
    select: {
      id: true,
      milestoneId: true,
      position: true,
    },
  })

  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id } })
    await tx.task.updateMany({
      where: {
        milestoneId: task.milestoneId,
        position: {
          gt: task.position,
        },
      },
      data: {
        position: {
          decrement: 1,
        },
      },
    })
  })

  return new Response(null, { status: 204 })
}
