// // export const runtime = "nodejs";

import { RequirementEngineerAgent } from "@/lib/sdlc/agents";
import { z } from "zod";

const RequestSchema = z.object({
  phase: z.enum(["requirements"]).default("requirements"),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  context: z.string().optional(),
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
    const { phase, messages, context } = RequestSchema.parse(json);

    if (phase !== "requirements") {
      return Response.json({ error: "Unsupported phase" }, { status: 400 });
    }

    const result = await RequirementEngineerAgent({ messages, context });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // If the model/provider fails, it's usually an upstream/server issue.
    const status = message.toLowerCase().includes("not found") ? 502 : 400;
    return Response.json({ error: message }, { status });
  }
}
