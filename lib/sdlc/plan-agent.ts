import { generateObject } from "ai"
import { z } from "zod"

export type PlanAgentInput = {
  projectName: string
  designDocMarkdown: string
  rtmMarkdown: string
  testsMarkdown: string
}

const TaskSchema = z
  .object({
    title: z.string().min(1),
  })
  .strict()

const MilestoneSchema = z
  .object({
    title: z.string().min(1),
    tasks: z.array(TaskSchema),
  })
  .strict()

const PhaseTypeSchema = z.enum(["PLANNING", "DESIGN", "DEV", "TESTING", "DEPLOY"])

export const PlanAgentOutputSchema = z
  .object({
    summary: z.string().min(1),
    phases: z
      .array(
        z
          .object({
            phaseType: PhaseTypeSchema,
            milestones: z.array(MilestoneSchema),
          })
          .strict()
      )
      .min(1),
  })
  .strict()

export type PlanAgentOutput = z.infer<typeof PlanAgentOutputSchema>

export async function PlanAgent(input: PlanAgentInput): Promise<PlanAgentOutput> {
  const system =
    "You are a senior engineering lead. Create a pragmatic milestone/task plan the team can execute. " +
    "Use only the provided SDLC docs as source of truth. " +
    "Output must match the schema exactly; do not add extra keys. " +
    "Milestones and tasks must be concrete, implementation-oriented, and ordered."

  const prompt =
    `Project: ${input.projectName}\n\n` +
    `Design Doc:\n${input.designDocMarkdown}\n\n` +
    `RTM:\n${input.rtmMarkdown}\n\n` +
    `Tests:\n${input.testsMarkdown}\n\n` +
    "Generate 5 phases (PLANNING, DESIGN, DEV, TESTING, DEPLOY). " +
    "Each phase should have 2-4 milestones. Each milestone should have 2-5 tasks. " +
    "Keep titles short and action-oriented."

  const { object } = await generateObject({
    model: "openai/gpt-4.1-mini",
    schema: PlanAgentOutputSchema,
    system,
    prompt,
    temperature: 0.2,
  })

  return object
}
