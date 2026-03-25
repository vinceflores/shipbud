// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ALLOWED_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'] as const

type PatchProjectBody = {
  name?: unknown
  description?: unknown
  targetDate?: unknown
  status?: unknown
}

function parsePatchBody(body: PatchProjectBody) {
  const data: {
    name?: string
    description?: string | null
    targetDate?: Date | null
    status?: (typeof ALLOWED_STATUSES)[number]
  } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new Error('name must be a non-empty string')
    }
    data.name = body.name.trim()
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      data.description = null
    } else if (typeof body.description === 'string') {
      const trimmed = body.description.trim()
      data.description = trimmed.length ? trimmed : null
    } else {
      throw new Error('description must be a string or null')
    }
  }

  if (body.targetDate !== undefined) {
    if (body.targetDate === null || body.targetDate === '') {
      data.targetDate = null
    } else if (typeof body.targetDate === 'string') {
      const parsed = new Date(body.targetDate)
      if (Number.isNaN(parsed.getTime())) {
        throw new Error('targetDate must be a valid date string')
      }
      data.targetDate = parsed
    } else {
      throw new Error('targetDate must be a string or null')
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUSES.includes(body.status as (typeof ALLOWED_STATUSES)[number])) {
      throw new Error('status must be one of ACTIVE, COMPLETED, ARCHIVED')
    }
    data.status = body.status as (typeof ALLOWED_STATUSES)[number]
  }

  if (Object.keys(data).length === 0) {
    throw new Error('No updatable fields provided')
  }

  return data
}

export async function GET(
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
      repo: true,
      phases: {
        orderBy: {
          position: 'asc',
        },
        include: {
          milestones: {
            orderBy: {
              position: 'asc',
            },
            include: {
              tasks: {
                orderBy: {
                  position: 'asc',
                },
              },
            },
          },
        },
      },
    },
  })

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  return Response.json(project)
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
    const existing = await prisma.project.findFirst({
      where: {
        id,
        ownerId: session.user.sub,
      },
      select: {
        id: true,
      },
    })

    if (!existing) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = (await _req.json()) as PatchProjectBody
    const data = parsePatchBody(body)

    const updated = await prisma.project.update({
      where: {
        id,
      },
      data,
    })

    return Response.json(updated)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid update payload' },
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
  const project = await prisma.project.findFirst({
    where: {
      id,
      ownerId: session.user.sub,
    },
    select: {
      id: true,
    },
  })

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  await prisma.project.delete({
    where: {
      id,
    },
  })

  return new Response(null, { status: 204 })
}
