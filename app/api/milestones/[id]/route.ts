// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ITEM_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const

type PatchMilestoneBody = {
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

function parsePatchBody(body: PatchMilestoneBody) {
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
    const milestone = await prisma.milestone.findFirst({
      where: {
        id,
        phase: {
          project: {
            ownerId: session.user.sub,
          },
        },
      },
      select: {
        id: true,
        phaseId: true,
        position: true,
      },
    })

    if (!milestone) {
      return Response.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const body = (await _req.json()) as PatchMilestoneBody
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
        const siblingCount = await tx.milestone.count({ where: { phaseId: milestone.phaseId } })
        const maxPosition = Math.max(0, siblingCount - 1)
        const targetPosition = Math.min(parsed.position, maxPosition)

        if (targetPosition < milestone.position) {
          await tx.milestone.updateMany({
            where: {
              phaseId: milestone.phaseId,
              position: {
                gte: targetPosition,
                lt: milestone.position,
              },
            },
            data: {
              position: {
                increment: 1,
              },
            },
          })
        } else if (targetPosition > milestone.position) {
          await tx.milestone.updateMany({
            where: {
              phaseId: milestone.phaseId,
              position: {
                gt: milestone.position,
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

      return tx.milestone.update({
        where: { id },
        data: updateData,
      })
    })

    return Response.json(updated)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid milestone payload' },
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
  const milestone = await prisma.milestone.findFirst({
    where: {
      id,
      phase: {
        project: {
          ownerId: session.user.sub,
        },
      },
    },
    select: {
      id: true,
      phaseId: true,
      position: true,
    },
  })

  if (!milestone) {
    return Response.json({ error: 'Milestone not found' }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.milestone.delete({ where: { id } })
    await tx.milestone.updateMany({
      where: {
        phaseId: milestone.phaseId,
        position: {
          gt: milestone.position,
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
