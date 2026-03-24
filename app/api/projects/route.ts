// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

export async function POST(_req: Request) {
  try {
    const session = await auth0.getSession()

    if(!session) {
      return new Response("Unauthorized", {status: 401})
    }
    const body = await _req.json()
    const { name, description, targetDate } = body as {
      name: string
      description?: string | null
      targetDate?: string | null
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description ?? null,
        targetDate: targetDate ? new Date(targetDate) : null,
        ownerId: session.user.sub,
      },
    })

    return Response.json(project, { status: 201 })
  } catch (error) {
    console.log(error)
    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }
}

/**
 *  Get all projects for a user
 * @param _req 
 */
export async function GET(_req: Request) {

  try {
    const session = await auth0.getSession()
    if(!session) {
      return new Response("Unauthorized", {status: 401})
    }
    const projects = await prisma.project.findMany({
      where: {
        ownerId: session.user.sub
      }
    })
    return Response.json(projects)
  } catch (error) {
    console.log(error)
  } 

}
