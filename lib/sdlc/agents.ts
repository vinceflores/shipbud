"use server"
import { generateObject, generateText } from "ai";
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

    // Phase 1: interview. Do NOT force a schema-shaped response here.
    // We ask the model to decide whether it has enough info to draft requirements.
    const interviewSystem =
        system +
        "\n\nYou must start by asking the user clarifying questions until you have enough info " +
        "to write functional and non-functional requirements. " +
        "When information is missing, ask at most 5 short questions at a time. " +
        "Do not output JSON in this step.";

    const interviewPrompt =
        `Context (optional):\n${input.context ?? "(none)"}\n\n` +
        `Conversation so far:\n${transcript}\n\n` +
        "Determine if you have enough information to draft requirements. " +
        "If not, ask the next questions to gather what you need. " +
        "If yes, respond with exactly the single line: READY";

    const interview = await generateText({
        model: "openai/gpt-4.1-mini",
        system: interviewSystem,
        prompt: interviewPrompt,
        temperature: 0.3,
    });

    const interviewText = interview.text.trim();

    // If not ready, return an object with open questions and the next message.
    if (interviewText !== "READY") {
        return {
            summary:
                "Still gathering information to draft functional and non-functional requirements.",
            assumptions: [],
            constraints: [],
            functionalRequirements: [],
            nonFunctionalRequirements: [],
            outOfScope: [],
            openQuestions: [],
            nextAssistantMessage: interviewText,
        };
    }

    // Phase 2: structured requirements output.
    const requirementsPrompt =
        `Context (optional):\n${input.context ?? "(none)"}\n\n` +
        `Conversation so far:\n${transcript}\n\n` +
        "Now produce the current requirements engineering state.";

    const { object } = await generateObject({
        model: "openai/gpt-4.1-mini",
        schema: RequirementEngineerOutputSchema,
        system:
            system +
            "\n\nOnly output what the schema asks for. " +
            "If some details are still missing, include them in openQuestions and assumptions.",
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

    const interviewSystem =
        system +
        "\n\nStart by asking clarifying questions until you have enough information to draft a coherent design. " +
        "Ask at most 5 short questions at a time. Do not output JSON in this step.";

    const requirementsSection = input.requirementsMarkdown
        ? `\n\nCurrent requirements (draft):\n${input.requirementsMarkdown}`
        : "";

    const interviewPrompt =
        `Context (optional):\n${input.context ?? "(none)"}\n\n` +
        `Conversation so far:\n${transcript}` +
        requirementsSection +
        "\n\nDetermine if you have enough information to draft the design doc. " +
        "If not, ask the next questions to gather what you need. " +
        'If yes, respond with exactly the single line: READY';

    const interview = await generateText({
        model: "openai/gpt-4.1-mini",
        system: interviewSystem,
        prompt: interviewPrompt,
        temperature: 0.3,
    });

    const interviewText = interview.text.trim();

    if (interviewText !== "READY") {
        return {
            summary:
                "Still gathering information to draft a system design that matches the requirements.",
            goals: [],
            nonGoals: [],
            assumptions: [],
            constraints: [],
            architecture: {
                overview: "",
                components: [],
                keyFlows: [],
            },
            dataModel: {
                entities: [],
                storageNotes: [],
            },
            apiDesign: {
                endpoints: [],
                events: [],
            },
            tradeoffs: [],
            openQuestions: [],
            nextAssistantMessage: interviewText,
        };
    }

    const designPrompt =
        `Context (optional):\n${input.context ?? "(none)"}\n\n` +
        `Conversation so far:\n${transcript}` +
        requirementsSection +
        "\n\nNow produce the current design state.";

    const { object } = await generateObject({
        model: "openai/gpt-4.1-mini",
        schema: DesignAgentOutputSchema,
        system:
            system +
            "\n\nOnly output what the schema asks for. " +
            "If details are missing, reflect them in openQuestions/assumptions and keep the design minimal.",
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
