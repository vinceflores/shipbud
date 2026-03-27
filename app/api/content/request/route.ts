import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'
// Removed missing enum import

export async function POST(req: Request) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { projectId, build_format } = body as { projectId?: string; build_format?: string }

    if (!projectId) {
      return Response.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!build_format || !['TWITTER_POST', 'README', 'BUILD_STORY', 'OBSTACLE_POST'].includes(build_format)) {
      return Response.json({ error: 'valid build_format is required' }, { status: 400 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.sub,
      },
      include: {
        designDoc: true,
        journalEntries: {
          include: {
            milestone: {
              where: {
                status: 'DONE'
              }
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const journal_entries = project.journalEntries.map((entry) => ({
      milestone: entry.milestone?.title || 'General',
      content: typeof entry.content === 'object' ? JSON.stringify(entry.content) : String(entry.content || ''),
      createdAt: entry.createdAt.toISOString(),
      type: entry.type,
    }))

    const n8nUrl = process.env.N8N_CONTENT_WEBHOOK_URL
    if (!n8nUrl) {
      return Response.json({ error: 'N8N webhook URL not configured' }, { status: 500 })
    }

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_doc: project.designDoc?.markdown || '',
        build_format,
        journal_entries,
      }),
    })

    if (!response.ok) {
        throw new Error('Failed to generate content: ' + await response.text())
    }

    const n8nBody = await response.json()
    
    let content = ''
    if (Array.isArray(n8nBody) && n8nBody.length > 0) {
      const first = n8nBody[0]
      content = first?.response || first?.content || first?.text || JSON.stringify(first)
    } else if (typeof n8nBody === 'object' && n8nBody !== null) {
      content = n8nBody.response || n8nBody.content || n8nBody.text || JSON.stringify(n8nBody)
    } else {
      content = String(n8nBody || '')
    }

    // Database record
    const contentRequest = await prisma.contentRequest.create({
      data: {
        projectId,
        source: 'FULL_PROJECT' as any,
        sourceId: projectId,
        formats: [build_format as any],
        drafts: {
          create: [{
            format: build_format as any,
            body: content,
          }]
        }
      },
      include: {
        drafts: true,
      }
    })

    return Response.json(contentRequest)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
