// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ENTRY_STATUSES = ['DRAFT', 'CONFIRMED'] as const

type EntryStatus = (typeof ENTRY_STATUSES)[number]
type EntryType = 'OBSTACLE' | 'WIN' | 'DECISION'

type ObstacleContent = {
  problem: string
  root_cause: string
  solution: string
}

type WinContent = {
  description: string
}

type DecisionContent = {
  description: string
  rationale: string
}

type JournalContent = ObstacleContent | WinContent | DecisionContent

type PatchJournalBody = {
  type?: unknown
  milestoneId?: unknown
  status?: unknown
  content?: unknown
}

function requireNonEmptyString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`)
  }
  return value.trim()
}

function requireObject(value: unknown, fieldName: string) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`)
  }
  return value as Record<string, unknown>
}

function parseEntryStatus(value: unknown): EntryStatus {
  if (typeof value !== 'string' || !ENTRY_STATUSES.includes(value as EntryStatus)) {
    throw new Error('status must be one of DRAFT, CONFIRMED')
  }
  return value as EntryStatus
}

function parseContentByType(type: EntryType, content: unknown): JournalContent {
  const raw = requireObject(content, 'content')

  if (type === 'OBSTACLE') {
    return {
      problem: requireNonEmptyString(raw.problem, 'content.problem'),
      root_cause: requireNonEmptyString(raw.root_cause, 'content.root_cause'),
      solution: requireNonEmptyString(raw.solution, 'content.solution'),
    }
  }

  if (type === 'WIN') {
    return {
      description: requireNonEmptyString(raw.description, 'content.description'),
    }
  }

  return {
    description: requireNonEmptyString(raw.description, 'content.description'),
    rationale: requireNonEmptyString(raw.rationale, 'content.rationale'),
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await context.params
    const existing = await prisma.journalEntry.findFirst({
      where: {
        id,
        project: {
          ownerId: session.user.sub,
        },
      },
      select: {
        id: true,
        projectId: true,
        type: true,
      },
    })

    if (!existing) {
      return Response.json({ error: 'Journal entry not found' }, { status: 404 })
    }

    const body = (await req.json()) as PatchJournalBody
    if (body.type !== undefined) {
      return Response.json({ error: 'type is immutable and cannot be updated' }, { status: 400 })
    }

    const updateData: {
      milestoneId?: string
      phaseId?: string
      status?: EntryStatus
      content?: Record<string, unknown>
    } = {}

    if (body.milestoneId !== undefined) {
      const milestoneId = requireNonEmptyString(body.milestoneId, 'milestoneId')
      const milestone = await prisma.milestone.findFirst({
        where: {
          id: milestoneId,
          phase: {
            projectId: existing.projectId,
          },
        },
        select: {
          id: true,
          phaseId: true,
        },
      })

      if (!milestone) {
        return Response.json({ error: 'Milestone not found' }, { status: 404 })
      }

      updateData.milestoneId = milestone.id
      updateData.phaseId = milestone.phaseId
    }

    if (body.status !== undefined) {
      updateData.status = parseEntryStatus(body.status)
    }

    if (body.content !== undefined) {
      const parsed = parseContentByType(existing.type as EntryType, body.content)
      updateData.content = parsed as unknown as Record<string, unknown>
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No updatable fields provided')
    }

    const updated = await prisma.journalEntry.update({
      where: {
        id: existing.id,
      },
      data: updateData as any,
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return Response.json(updated)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid journal payload' },
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
  const existing = await prisma.journalEntry.findFirst({
    where: {
      id,
      project: {
        ownerId: session.user.sub,
      },
    },
    select: {
      id: true,
    },
  })

  if (!existing) {
    return Response.json({ error: 'Journal entry not found' }, { status: 404 })
  }

  await prisma.journalEntry.delete({
    where: {
      id: existing.id,
    },
  })

  return new Response(null, { status: 204 })
}
