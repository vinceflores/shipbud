// export const runtime = "nodejs";
import { auth0 } from '@/lib/auth0'
import prisma from '@/lib/prisma'

type RepoConnectBody = {
  githubRepoUrl?: unknown
  webhookSecret?: unknown
  events?: unknown
}

function parseRepoUrl(repoUrl: string) {
  const normalized = repoUrl.trim().replace(/\.git$/, '')
  const match = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i)

  if (!match) {
    throw new Error('githubRepoUrl must be a valid https://github.com/{owner}/{repo} URL')
  }

  return {
    owner: match[1],
    repo: match[2],
    normalized,
  }
}

function resolveWebhookUrl(req: Request) {
  if (process.env.GITHUB_WEBHOOK_CALLBACK_URL) {
    return process.env.GITHUB_WEBHOOK_CALLBACK_URL
  }

  const url = new URL(req.url)
  return `${url.origin}/api/webhooks/github`
}

async function getGitHubTokenFromVault() {
  const connection = process.env.AUTH0_GITHUB_CONNECTION ?? 'github'
  const { token } = await auth0.getAccessTokenForConnection({ connection })
  return token
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
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

    const body = (await _req.json()) as RepoConnectBody
    const githubRepoUrl = typeof body.githubRepoUrl === 'string' ? body.githubRepoUrl : ''

    if (!githubRepoUrl.trim()) {
      return Response.json({ error: 'githubRepoUrl is required' }, { status: 400 })
    }

    const { owner, repo, normalized } = parseRepoUrl(githubRepoUrl)
    const webhookSecret =
      typeof body.webhookSecret === 'string' && body.webhookSecret.length > 0
        ? body.webhookSecret
        : process.env.GITHUB_WEBHOOK_SECRET

    if (!webhookSecret) {
      return Response.json(
        { error: 'Missing webhook secret. Provide webhookSecret or set GITHUB_WEBHOOK_SECRET.' },
        { status: 500 },
      )
    }

    const events = Array.isArray(body.events)
      ? body.events.filter((event): event is string => typeof event === 'string' && event.length > 0)
      : ['push']

    if (events.length === 0) {
      return Response.json({ error: 'events must contain at least one webhook event' }, { status: 400 })
    }

    const token = await getGitHubTokenFromVault()
    const webhookResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events,
        config: {
          url: resolveWebhookUrl(_req),
          content_type: 'json',
          secret: webhookSecret,
          insecure_ssl: '0',
        },
      }),
    })

    if (!webhookResponse.ok) {
      const errorPayload = await webhookResponse.text()
      return Response.json(
        {
          error: 'Failed to register GitHub webhook',
          details: errorPayload,
        },
        { status: webhookResponse.status },
      )
    }

    const webhook = (await webhookResponse.json()) as { id?: number }

    if (typeof webhook.id !== 'number') {
      return Response.json({ error: 'GitHub webhook registration returned an invalid response' }, { status: 502 })
    }

    const repoConnection = await prisma.repo.upsert({
      where: {
        projectId: id,
      },
      create: {
        projectId: id,
        githubRepoUrl: normalized,
        webhookId: String(webhook.id),
      },
      update: {
        githubRepoUrl: normalized,
        webhookId: String(webhook.id),
        connectedAt: new Date(),
      },
    })

    return Response.json(repoConnection, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to connect repo' },
      { status: 400 },
    )
  }
}
