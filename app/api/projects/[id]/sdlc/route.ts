import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const TabSchema = z.enum(['design-doc', 'rtm', 'tests'])

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const PhaseDataSchema = z.object({
  messages: z.array(MessageSchema),
  tabContents: z.record(TabSchema, z.string()),
})

const SdlcStateSchema = z.object({
  requirements: PhaseDataSchema,
  design: PhaseDataSchema,
  tests: PhaseDataSchema,
})

function sanitizeState(input: unknown) {
  const parsed = SdlcStateSchema.parse(input)

  // Ensure we only persist allowed tabs.
  const pickTabs = (tabContents: Record<string, string>) => ({
    'design-doc': tabContents['design-doc'] ?? '',
    rtm: tabContents.rtm ?? '',
    tests: tabContents.tests ?? '',
  })

  return {
    requirements: {
      messages: parsed.requirements.messages,
      tabContents: pickTabs(parsed.requirements.tabContents),
    },
    design: {
      messages: parsed.design.messages,
      tabContents: pickTabs(parsed.design.tabContents),
    },
    tests: {
      messages: parsed.tests.messages,
      tabContents: pickTabs(parsed.tests.tabContents),
    },
  }
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth0.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await context.params
  if (!id || id === 'undefined' || id === 'null') {
    return Response.json({ error: 'Invalid project id' }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { id, ownerId: session.user.sub },
    select: { id: true },
  })

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  const existing = await prisma.projectSdlcState.findUnique({
    where: { projectId: project.id },
    select: { state: true, updatedAt: true },
  })

  return Response.json({ state: existing?.state ?? null, updatedAt: existing?.updatedAt ?? null })
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth0.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = await context.params
  if (!id || id === 'undefined' || id === 'null') {
    return Response.json({ error: 'Invalid project id' }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { id, ownerId: session.user.sub },
    select: { id: true },
  })

  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  const body = (await req.json()) as { state?: unknown }
  if (body?.state === undefined) {
    return Response.json({ error: 'Missing state' }, { status: 400 })
  }

  const sanitized = sanitizeState(body.state)

  const saved = await prisma.projectSdlcState.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      state: sanitized,
    },
    update: {
      state: sanitized,
    },
    select: {
      updatedAt: true,
    },
  })

  return Response.json({ ok: true, updatedAt: saved.updatedAt })
}
