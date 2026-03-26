// // export const runtime = "nodejs";

import { DesignAgent, RequirementEngineerAgent, TestsAgent } from "@/lib/sdlc/agents";
import { z } from "zod";

const RequestSchema = z.object({
  phase: z.enum(["requirements", "design", "tests"]).default("requirements"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  context: z.string().optional(),
  requirementsMarkdown: z.string().optional(),
  functionalRequirements: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(_req: Request) {
  return new Response("Not Implemented", { status: 501 });
}

export async function POST(req: Request) {
  try {
    if (!process.env.AI_GATEWAY_API_KEY) {
      return Response.json(
        {
          error:
            "Requirements agent is not configured. Set AI_GATEWAY_API_KEY in your environment.",
        },
        { status: 500 }
      );
    }

    const json = await req.json();
    const { phase, messages, context, requirementsMarkdown, functionalRequirements } =
      RequestSchema.parse(json);

    if (phase === "requirements") {
      const result = await RequirementEngineerAgent({ messages, context });
      return Response.json(result);
    }

    if (phase === "design") {
      const result = await DesignAgent({ messages, context, requirementsMarkdown });
      return Response.json(result);
    }

    if (phase === "tests") {
      const result = await TestsAgent({
        messages,
        projectName: undefined,
        functionalRequirements: functionalRequirements ?? [],
      });
      return Response.json(result);
    }

    return Response.json({ error: "Unsupported phase" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // If the model/provider fails, it's usually an upstream/server issue.
    const status = message.toLowerCase().includes("not found") ? 502 : 400;
    return Response.json({ error: message }, { status });
  }
}
