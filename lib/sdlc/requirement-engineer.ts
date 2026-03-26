import { z } from "zod";

export type RequirementEngineerInput = {
  /**
   * Full conversation so far (recommended). The agent will infer state from this.
   * Provide user+assistant turns in chronological order.
   */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Optional extra context (existing repo/product constraints, stakeholders, etc.). */
  context?: string;
};

export const RequirementEngineerOutputSchema = z.object({
  summary: z
    .string()
    .describe("One-paragraph recap of the product/problem and current understanding."),
  assumptions: z
    .array(z.string())
    .describe("Assumptions the agent is making due to missing info."),
  constraints: z
    .array(z.string())
    .describe("Hard constraints: platform, budget, compliance, deadlines, integrations."),
  functionalRequirements: z
    .array(
      z
        .object({
        id: z.string().describe("Stable identifier like FR-001"),
        name: z.string(),
        description: z.string(),
        priority: z.number().int().min(1).max(5).describe("1=highest, 5=lowest"),
        acceptanceCriteria: z.array(z.string()),
        })
        .strict()
    ),
  nonFunctionalRequirements: z
    .array(
      z
        .object({
        id: z.string().describe("Stable identifier like NFR-001"),
        name: z.string(),
        description: z.string(),
        priority: z.number().int().min(1).max(5).describe("1=highest, 5=lowest"),
        acceptanceCriteria: z.array(z.string()),
        })
        .strict()
    ),
  outOfScope: z
    .array(z.string())
    .describe("Explicitly excluded features to reduce ambiguity."),
  openQuestions: z
    .array(
      z.object({
        id: z.string().describe("Like Q-001"),
        question: z.string(),
        why: z.string().describe("Why this matters / what decision it impacts."),
      })
    ),
  nextAssistantMessage: z
    .string()
    .describe(
      "The next message the Requirements Engineer should ask the user. Keep it short, interview-style."
    ),
});

export type RequirementEngineerOutput = z.infer<
  typeof RequirementEngineerOutputSchema
>;
