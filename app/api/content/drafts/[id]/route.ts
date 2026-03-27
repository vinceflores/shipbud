import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

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

    const body = await req.json()
    const { editedBody } = body as { editedBody?: string }

    if (editedBody === undefined) {
      return Response.json({ error: 'editedBody is required' }, { status: 400 })
    }

    // Verify ownership indirectly via draft -> request -> project
    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        contentRequest: {
          include: {
            project: true
          }
        }
      }
    })

    if (!draft || draft.contentRequest.project.ownerId !== session.user.sub) {
       return Response.json({ error: 'Draft not found' }, { status: 404 })
    }

    const updated = await prisma.contentDraft.update({
      where: { id },
      data: {
        editedBody,
        status: 'EDITED'
      }
    })

    return Response.json(updated)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth0.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id } = await context.params

    const draft = await prisma.contentDraft.findUnique({
      where: { id },
      include: {
        contentRequest: {
          include: {
            project: true
          }
        }
      }
    })

    if (!draft || draft.contentRequest.project.ownerId !== session.user.sub) {
       return Response.json({ error: 'Draft not found' }, { status: 404 })
    }

    await prisma.contentDraft.delete({
      where: { id }
    })

    return new Response(null, { status: 204 })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
