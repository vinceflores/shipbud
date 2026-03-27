// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

const ENTRY_TYPES = ['OBSTACLE', 'WIN', 'DECISION'] as const
const ENTRY_STATUSES = ['DRAFT', 'CONFIRMED'] as const

type EntryType = (typeof ENTRY_TYPES)[number]
type EntryStatus = (typeof ENTRY_STATUSES)[number]

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

function parseEntryType(value: unknown): EntryType {
  if (typeof value !== 'string' || !ENTRY_TYPES.includes(value as EntryType)) {
    throw new Error('type must be one of OBSTACLE, WIN, DECISION')
  }
  return value as EntryType
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

type CreateJournalBody = {
  projectId?: unknown
  milestoneId?: unknown
  type?: unknown
  status?: unknown
  content?: unknown
}

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = (await req.json()) as CreateJournalBody
    const projectId = requireNonEmptyString(body.projectId, 'projectId')
    const milestoneId = requireNonEmptyString(body.milestoneId, 'milestoneId')
    const type = parseEntryType(body.type)
    const status = body.status === undefined ? 'CONFIRMED' : parseEntryStatus(body.status)
    const parsedContent = parseContentByType(type, body.content)

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.sub,
      },
      select: {
        id: true,
      },
    })

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        phase: {
          projectId,
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

    const created = await prisma.journalEntry.create({
      data: {
        projectId,
        phaseId: milestone.phaseId,
        milestoneId: milestone.id,
        type,
        source: 'MANUAL',
        status,
        content: parsedContent as unknown as Record<string, unknown>,
      },
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return Response.json(created, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid journal payload' },
      { status: 400 },
    )
  }
}

export async function GET(req: Request) {
  const session = await auth0.getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId')?.trim() || ''

  if (!projectId) {
    return Response.json({ error: 'projectId is required' }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: session.user.sub,
    },
    select: {
      id: true,
    },
  })

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  const entries = await prisma.journalEntry.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      milestone: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  return Response.json(entries)
}
