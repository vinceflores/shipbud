import { z } from "zod";

export type DesignAgentInput = {
  /** Full conversation so far (recommended). Provide user+assistant turns in chronological order. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Optional extra context (existing repo/product constraints, stakeholders, etc.). */
  context?: string;
  /** Optional requirements snapshot to ground design decisions. */
  requirementsMarkdown?: string;
};

export const DesignAgentOutputSchema = z
  .object({
    summary: z
      .string()
      .describe("One-paragraph recap of the system and design direction."),
    goals: z.array(z.string()).describe("Design goals (what we're optimizing for)."),
    nonGoals: z
      .array(z.string())
      .describe("Explicit non-goals to avoid scope creep."),
    assumptions: z
      .array(z.string())
      .describe("Assumptions being made due to missing info."),
    constraints: z
      .array(z.string())
      .describe("Hard constraints: platform, integrations, compliance, deadlines."),

    architecture: z
      .object({
        overview: z
          .string()
          .describe("High-level architecture overview in prose."),
        components: z
          .array(
            z
              .object({
                name: z.string(),
                responsibilities: z.array(z.string()),
                technology: z
                  .string()
                  .nullable()
                  .describe(
                    "Primary technology for this component (or null if not decided)."
                  ),
              })
              .strict()
          )
          .describe("Key components/services and their responsibilities."),
        keyFlows: z
          .array(
            z
              .object({
                name: z.string(),
                steps: z.array(z.string()),
              })
              .strict()
          )
          .describe("Important user/system flows with step-by-step sequence."),
      })
      .strict(),

    dataModel: z
      .object({
        entities: z
          .array(
            z
              .object({
                name: z.string(),
                description: z.string(),
                fields: z.array(z.string()).describe("Field list like 'id: uuid (PK)'."),
                relationships: z.array(z.string()).describe("Relationships like 'User 1..* Project'."),
              })
              .strict()
          )
          .describe("Logical data model entities."),
        storageNotes: z
          .array(z.string())
          .describe("Indexing, migrations, retention, or consistency notes."),
      })
      .strict(),

    apiDesign: z
      .object({
        endpoints: z
          .array(
            z
              .object({
                method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
                path: z.string(),
                description: z.string(),
                request: z
                  .string()
                  .nullable()
                  .describe("Request shape/fields (or null if none/unknown)."),
                response: z
                  .string()
                  .nullable()
                  .describe("Response shape/fields (or null if none/unknown)."),
                authz: z
                  .string()
                  .nullable()
                  .describe("Authorization requirements (or null if unknown)."),
              })
              .strict()
          )
          .describe("External or internal API endpoints."),
        events: z
          .array(
            z
              .object({
                name: z.string(),
                payload: z
                  .string()
                  .nullable()
                  .describe("Event payload shape (or null if unknown)."),
                producers: z
                  .array(z.string())
                  .nullable()
                  .describe("Producers of the event (or null if unknown)."),
                consumers: z
                  .array(z.string())
                  .nullable()
                  .describe("Consumers of the event (or null if unknown)."),
              })
              .strict()
          )
          .describe("Async events/messages, if applicable."),
      })
      .strict(),

    tradeoffs: z
      .array(
        z
          .object({
            decision: z.string(),
            options: z.array(z.string()),
            chosen: z.string(),
            rationale: z.string(),
            risks: z.array(z.string()),
            mitigations: z.array(z.string()),
          })
          .strict()
      )
      .describe("Key design decisions and tradeoffs."),

    openQuestions: z
      .array(
        z
          .object({
            id: z.string().describe("Stable identifier like DQ-001"),
            question: z.string(),
            why: z.string(),
          })
          .strict()
      )
      .describe("Remaining questions that block or influence design."),

    nextAssistantMessage: z
      .string()
      .describe(
        "The next message the assistant should say to the user (questions, confirmations, or next steps)."
      ),
  })
  .strict();

export type DesignAgentOutput = z.infer<typeof DesignAgentOutputSchema>;
