import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return Response.json({ error: 'projectId parameter is required' }, { status: 400 })
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: session.user.sub,
      }
    })

    if (!project) {
        return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const requests = await prisma.contentRequest.findMany({
      where: {
        projectId,
      },
      include: {
        drafts: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    })

    // Flatten to drafts along with their parent Request timestamp/source
    const drafts = requests.flatMap((req) => 
      req.drafts.map((draft) => ({
        ...draft,
        requestedAt: req.requestedAt,
        source: req.source,
      }))
    )

    return Response.json(drafts)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}