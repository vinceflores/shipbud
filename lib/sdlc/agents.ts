"use server"
import { generateObject, generateText } from "ai";
import {
    RequirementEngineerInput,
    RequirementEngineerOutput,
    RequirementEngineerOutputSchema,
} from "@/lib/sdlc/requirement-engineer";

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
