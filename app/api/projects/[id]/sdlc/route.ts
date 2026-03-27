import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const TabSchema = z.enum(['requirements-doc', 'design-doc', 'rtm', 'tests'])

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const PhaseDataSchema = z.object({
  messages: z.array(MessageSchema),
  tabContents: z.record(TabSchema, z.string()),
})

const IncomingMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

const IncomingPhaseDataSchema = z.object({
  messages: z.array(IncomingMessageSchema).optional(),
  tabContents: z
    .object({
      'requirements-doc': z.string().optional(),
      'design-doc': z.string().optional(),
      rtm: z.string().optional(),
      tests: z.string().optional(),
    })
    .optional(),
})

const IncomingSdlcStateSchema = z.object({
  requirements: IncomingPhaseDataSchema.optional(),
  design: IncomingPhaseDataSchema.optional(),
  tests: IncomingPhaseDataSchema.optional(),
})

const SdlcStateSchema = z.object({
  requirements: PhaseDataSchema,
  design: PhaseDataSchema,
  tests: PhaseDataSchema,
})

type FullSdlcState = z.infer<typeof SdlcStateSchema>
type FullMessage = z.infer<typeof MessageSchema>
type ProjectDocsPayload = {
  requirementsDocMarkdown: string
  designDocMarkdown: string
  rtmMarkdown: string
  testsMarkdown: string
}

async function upsertProjectDocs(projectId: string, docs: ProjectDocsPayload) {
  const [requirementsDoc, designDoc, rtmDoc, testsDoc] = await prisma.$transaction([
    prisma.projectRequirementsDoc.upsert({
      where: { projectId },
      create: { projectId, markdown: docs.requirementsDocMarkdown },
      update: { markdown: docs.requirementsDocMarkdown },
      select: { id: true },
    }),
    prisma.projectDesignDoc.upsert({
      where: { projectId },
      create: { projectId, markdown: docs.designDocMarkdown },
      update: { markdown: docs.designDocMarkdown },
      select: { id: true },
    }),
    prisma.projectRtmDoc.upsert({
      where: { projectId },
      create: { projectId, markdown: docs.rtmMarkdown },
      update: { markdown: docs.rtmMarkdown },
      select: { id: true },
    }),
    prisma.projectTestsDoc.upsert({
      where: { projectId },
      create: { projectId, markdown: docs.testsMarkdown },
      update: { markdown: docs.testsMarkdown },
      select: { id: true },
    }),
  ])

  return { requirementsDoc, designDoc, rtmDoc, testsDoc }
}

function sanitizeState(input: unknown) {
  const parsed = IncomingSdlcStateSchema.parse(input)

  const normalizeMessages = (messages: z.infer<typeof IncomingMessageSchema>[] | undefined): FullMessage[] => {
    if (!messages?.length) return []

    return messages.map((message, index) => ({
      id: message.id ?? `msg-${Date.now()}-${index}`,
      role: message.role,
      content: message.content,
    }))
  }

  const pickTabs = (
    tabContents: z.infer<typeof IncomingPhaseDataSchema>['tabContents'] | undefined,
  ) => ({
    'requirements-doc': tabContents?.['requirements-doc'] ?? '',
    'design-doc': tabContents?.['design-doc'] ?? '',
    rtm: tabContents?.rtm ?? '',
    tests: tabContents?.tests ?? '',
  })

  return {
    requirements: {
      messages: normalizeMessages(parsed.requirements?.messages),
      tabContents: pickTabs(parsed.requirements?.tabContents),
    },
    design: {
      messages: normalizeMessages(parsed.design?.messages),
      tabContents: pickTabs(parsed.design?.tabContents),
    },
    tests: {
      messages: normalizeMessages(parsed.tests?.messages),
      tabContents: pickTabs(parsed.tests?.tabContents),
    },
  }
}

function emptyTabs() {
  return { 'requirements-doc': '', 'design-doc': '', rtm: '', tests: '' }
}

function emptyState(): FullSdlcState {
  return {
    requirements: {
      messages: [],
      tabContents: emptyTabs(),
    },
    design: {
      messages: [],
      tabContents: emptyTabs(),
    },
    tests: {
      messages: [],
      tabContents: emptyTabs(),
    },
  }
}

function coerceStoredState(state: unknown): FullSdlcState {
  const strict = SdlcStateSchema.safeParse(state)
  if (strict.success) return strict.data

  // Backward compatibility for older rows (messages-only / partial tabs).
  return sanitizeState(state)
}

async function ensureDocsFromLegacyJson(projectId: string) {
  const existing = await prisma.projectSdlcState.findUnique({
    where: { projectId },
    select: {
      id: true,
      state: true,
      requirementsDocId: true,
      designDocId: true,
      rtmDocId: true,
      testsDocId: true,
    },
  })

  if (!existing) return
  if (existing.requirementsDocId && existing.designDocId && existing.rtmDocId && existing.testsDocId) return

  const legacy = (existing.state ?? null) as any
  const requirementsDocMarkdown =
    legacy?.requirements?.tabContents?.['requirements-doc'] ??
    legacy?.requirements?.tabContents?.['design-doc']
  const designDocMarkdown = legacy?.design?.tabContents?.['design-doc']
  const rtmMarkdown = legacy?.design?.tabContents?.rtm
  const testsMarkdown = legacy?.tests?.tabContents?.tests

  // Only backfill if legacy JSON actually has meaningful markdown.
  if (
    typeof requirementsDocMarkdown !== 'string' ||
    typeof designDocMarkdown !== 'string' ||
    typeof rtmMarkdown !== 'string' ||
    typeof testsMarkdown !== 'string'
  ) {
    return
  }

  const { requirementsDoc, designDoc, rtmDoc, testsDoc } = await upsertProjectDocs(projectId, {
    requirementsDocMarkdown,
    designDocMarkdown,
    rtmMarkdown,
    testsMarkdown,
  })

  await prisma.projectSdlcState.update({
    where: { projectId },
    data: {
      requirementsDocId: requirementsDoc.id,
      designDocId: designDoc.id,
      rtmDocId: rtmDoc.id,
      testsDocId: testsDoc.id,
    },
  })
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

  await ensureDocsFromLegacyJson(project.id)

  const existing = await prisma.projectSdlcState.findUnique({
    where: { projectId: project.id },
    select: {
      state: true,
      updatedAt: true,
      requirementsDocId: true,
      designDocId: true,
      rtmDocId: true,
      testsDocId: true,
    },
  })

  const [requirementsDoc, designDoc, rtmDoc, testsDoc] = await prisma.$transaction([
    prisma.projectRequirementsDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
    prisma.projectDesignDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
    prisma.projectRtmDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
    prisma.projectTestsDoc.findUnique({ where: { projectId: project.id }, select: { markdown: true } }),
  ])

  const baseState = existing?.state ? coerceStoredState(existing.state) : emptyState()
  const hydrated: FullSdlcState = {
    requirements: {
      messages: baseState.requirements.messages,
      tabContents: {
        'requirements-doc':
          baseState.requirements.tabContents['requirements-doc'].trim() ||
          (requirementsDoc?.markdown ?? ''),
        'design-doc': baseState.requirements.tabContents['design-doc'],
        rtm: baseState.requirements.tabContents.rtm,
        tests: baseState.requirements.tabContents.tests,
      },
    },
    design: {
      messages: baseState.design.messages,
      tabContents: {
        'requirements-doc': baseState.design.tabContents['requirements-doc'],
        'design-doc':
          baseState.design.tabContents['design-doc'].trim() ||
          (designDoc?.markdown ?? ''),
        rtm: baseState.design.tabContents.rtm.trim() || (rtmDoc?.markdown ?? ''),
        tests: baseState.design.tabContents.tests,
      },
    },
    tests: {
      messages: baseState.tests.messages,
      tabContents: {
        'requirements-doc': baseState.tests.tabContents['requirements-doc'],
        'design-doc': baseState.tests.tabContents['design-doc'],
        rtm: baseState.tests.tabContents.rtm,
        tests: baseState.tests.tabContents.tests.trim() || (testsDoc?.markdown ?? ''),
      },
    },
  }

  const hasMessages =
    hydrated.requirements.messages.length > 0 ||
    hydrated.design.messages.length > 0 ||
    hydrated.tests.messages.length > 0

  const hasDocs =
    hydrated.requirements.tabContents['requirements-doc'].trim().length > 0 ||
    hydrated.requirements.tabContents['design-doc'].trim().length > 0 ||
    hydrated.requirements.tabContents.rtm.trim().length > 0 ||
    hydrated.requirements.tabContents.tests.trim().length > 0 ||
    hydrated.design.tabContents['requirements-doc'].trim().length > 0 ||
    hydrated.design.tabContents['design-doc'].trim().length > 0 ||
    hydrated.design.tabContents.rtm.trim().length > 0 ||
    hydrated.design.tabContents.tests.trim().length > 0 ||
    hydrated.tests.tabContents['requirements-doc'].trim().length > 0 ||
    hydrated.tests.tabContents['design-doc'].trim().length > 0 ||
    hydrated.tests.tabContents.rtm.trim().length > 0 ||
    hydrated.tests.tabContents.tests.trim().length > 0

  if (!existing && !hasMessages && !hasDocs) {
    return Response.json({ state: null, updatedAt: null })
  }

  return Response.json({ state: hydrated, updatedAt: existing?.updatedAt ?? null })
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

  let body: { state?: unknown }
  try {
    body = (await req.json()) as { state?: unknown }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body?.state === undefined) {
    return Response.json({ error: 'Missing state' }, { status: 400 })
  }

  let sanitized: FullSdlcState
  try {
    sanitized = sanitizeState(body.state)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Invalid SDLC state payload', details: error.flatten() },
        { status: 400 },
      )
    }

    throw error
  }

  // Ensure legacy JSON is backfilled first (so we don't lose existing docs).
  await ensureDocsFromLegacyJson(project.id)

  // Upsert doc tables from sanitized state.
  const requirementsDocMarkdown = sanitized.requirements.tabContents['requirements-doc']
  const designDocMarkdown = sanitized.design.tabContents['design-doc']
  const rtmMarkdown = sanitized.design.tabContents.rtm
  const testsMarkdown = sanitized.tests.tabContents.tests

  const { requirementsDoc, designDoc, rtmDoc, testsDoc } = await upsertProjectDocs(project.id, {
    requirementsDocMarkdown,
    designDocMarkdown,
    rtmMarkdown,
    testsMarkdown,
  })

  const saved = await prisma.projectSdlcState.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      state: sanitized,
      requirementsDocId: requirementsDoc.id,
      designDocId: designDoc.id,
      rtmDocId: rtmDoc.id,
      testsDocId: testsDoc.id,
    },
    update: {
      state: sanitized,
      requirementsDocId: requirementsDoc.id,
      designDocId: designDoc.id,
      rtmDocId: rtmDoc.id,
      testsDocId: testsDoc.id,
    },
    select: {
      updatedAt: true,
    },
  })

  return Response.json({ ok: true, updatedAt: saved.updatedAt })
}
