"use server"
import { generateObject } from "ai";
import {
    RequirementEngineerInput,
    RequirementEngineerOutput,
    RequirementEngineerOutputSchema,
} from "@/lib/sdlc/requirement-engineer";
import {
    DesignAgentInput,
    DesignAgentOutput,
    DesignAgentOutputSchema,
} from "@/lib/sdlc/design-agent";
import { TestsAgentOutput, TestsAgentOutputSchema } from "@/lib/sdlc/tests-agent";

/**
 * Interview user
 * 1. 
 */
export async function RequirementEngineerAgent(
    input: RequirementEngineerInput
): Promise<RequirementEngineerOutput> {
    const transcript = input.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

    const system =
        "You are a Requirements Engineer. Your job is to interview the user, remove ambiguity, " +
        "and produce a clean set of functional + non-functional requirements with acceptance criteria. " +
        "Be practical and specific. Keep priorities small integers (1 highest). Use stable IDs FR-###, NFR-###, Q-###. " +
        "Do not invent company names, compliance regimes, budgets, or timelines unless the user said so.";

    const requirementsPrompt =
        `Context (optional):\n${input.context ?? "(none)"}\n\n` +
        `Conversation so far:\n${transcript}\n\n` +
        "Produce the current requirements engineering state based on the latest message. " +
        "Always return a non-empty draft document state, even when information is incomplete. " +
        "Use assumptions/openQuestions to capture uncertainty and keep refining over time.";

    const { object } = await generateObject({
        model: "openai/gpt-4.1-mini",
        schema: RequirementEngineerOutputSchema,
        system:
            system +
            "\n\nOnly output what the schema asks for. " +
            "Never return placeholder summaries or empty drafts when user intent is present. " +
            "Generate at least one functional and one non-functional requirement from the current understanding. " +
            "If details are missing, include explicit openQuestions and assumptions, and make nextAssistantMessage ask focused follow-up questions.",
        prompt: requirementsPrompt,
        temperature: 0.2,
    });

    return object;
}

export async function DesignAgent(input: DesignAgentInput): Promise<DesignAgentOutput> {
    const transcript = input.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

    const system =
        "You are a Senior Software Architect acting as a Design agent. " +
        "Your job is to help the user make pragmatic system design decisions, " +
        "surface tradeoffs, and produce a clear design document that can be implemented. " +
        "Prefer simple architectures that fit the requirements. " +
        "Do not invent external constraints (budgets, compliance, deadlines) unless provided. " +
        "If requirements are ambiguous, ask clarifying questions before committing to design.";

    const requirementsSection = input.requirementsMarkdown
        ? `\n\nCurrent requirements (draft):\n${input.requirementsMarkdown}`
        : "";

    const designPrompt =
        `Context (optional):\n${input.context ?? "(none)"}\n\n` +
        `Conversation so far:\n${transcript}` +
        requirementsSection +
        "\n\nProduce the current design document state based on the latest message. " +
        "Always return a non-empty draft design document, even if some details are still unknown.";

    const { object } = await generateObject({
        model: "openai/gpt-4.1-mini",
        schema: DesignAgentOutputSchema,
        system:
            system +
            "\n\nOnly output what the schema asks for. " +
            "Never return placeholder summaries or empty drafts when user intent is present. " +
            "Provide at least a minimal architecture overview, one component, one key flow, and one API endpoint when possible. " +
            "If details are missing, reflect them in openQuestions/assumptions and ask focused follow-up questions in nextAssistantMessage.",
        prompt: designPrompt,
        temperature: 0.2,
    });

    return object;
}

export async function TestsAgent(input: {
    projectName?: string;
    functionalRequirements: Array<{ id: string; name: string; description?: string }>;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<TestsAgentOutput> {
    const transcript = input.messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");

    const system =
        "You are a Senior QA Engineer acting as a Tests agent. " +
        "Your job is to draft brief test suites for planning purposes only. " +
        "Create exactly 1 test suite per functional requirement (FR). " +
        "Each suite must reference its FR by ID (FR-###) and have a unique suite ID (TEST-SUITE-###). " +
        "Each suite should have 2-4 test cases with unique IDs (TEST-CASE-###). " +
        "Each test case must have a short description, an expected value (string|number|boolean), and an actual value string placeholder '(TBD)'. " +
        "Do not create suites for non-functional requirements. " +
        "If there are no functional requirements, produce an empty suite list and ask what FRs to test.";

    const frList = input.functionalRequirements
        .map((fr) => {
            const desc = fr.description?.trim() ? ` — ${fr.description.trim()}` : "";
            return `- ${fr.id}: ${fr.name}${desc}`;
        })
        .join("\n");

    const prompt =
        `Project: ${input.projectName ?? "(unknown)"}\n\n` +
        `Functional requirements:\n${frList || "- (none)"}\n\n` +
        `Conversation so far:\n${transcript}\n\n` +
        "Now draft test suites and cases. Keep output brief.";

    const { object } = await generateObject({
        model: "openai/gpt-4.1-mini",
        schema: TestsAgentOutputSchema,
        system,
        prompt,
        temperature: 0.2,
    });

    return object;
}
