import { z } from 'zod'

export const TestsAgentInputSchema = z.object({
  projectName: z.string().optional(),
  functionalRequirements: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1).optional(),
      })
    )
    .default([]),
})

export type TestsAgentInput = z.infer<typeof TestsAgentInputSchema>

const TestCaseSchema = z.object({
  id: z.string().regex(/^TEST-CASE-\d{3}$/),
  description: z.string().min(1),
  expected: z.union([z.string(), z.number(), z.boolean()]),
  actual: z.string().nullable().describe('Actual result (null if not executed yet).'),
})

const TestSuiteSchema = z.object({
  id: z.string().regex(/^TEST-SUITE-\d{3}$/),
  frId: z.string().regex(/^FR-\d{3}$/),
  name: z.string().min(1),
  testCases: z.array(TestCaseSchema).min(1),
})

const OpenQuestionSchema = z.object({
  id: z.string().regex(/^TQ-\d{3}$/),
  question: z.string().min(1),
})

export const TestsAgentOutputSchema = z.object({
  summary: z.string().min(1),
  testSuites: z.array(TestSuiteSchema),
  openQuestions: z.array(OpenQuestionSchema),
  nextAssistantMessage: z.string().min(1),
})

export type TestsAgentOutput = z.infer<typeof TestsAgentOutputSchema>
