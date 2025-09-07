import { Agent, InMemoryStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { scriptGeral } from "../scripts/geral";
import { SRDScript } from "../scripts/sdr-script";
import { memoryStorage } from "../utils/memory";
import { openai } from "../utils/openai";

export const SDRAgent = new Agent({
	name: "SOFIA",
	instructions: `${SRDScript} ${scriptGeral}`,
	llm: new VercelAIProvider(),
	model: openai("gpt-4o-mini"),
	tools: [],
	subAgents: [],
	purpose: "Agente de SRD",
	userContext: new Map([["environment", "production"]]),
	memory: memoryStorage,
});

// aquui é dado a resposta // retorne a resposta inteira e quebre em chunks
export async function SDRChat(
    input: string,
    userId: string,
    conversationId: string,
) {
    console.log(`User: ${input}`);
    // Use streamText for interactive responses
    const result = await SDRAgent.generateText(input, {
        userId,
        conversationId,
    });
    const anyRes = result as unknown as Record<string, unknown>;
    const reply =
        (anyRes?.reply as string | undefined) ??
        (anyRes?.text as string | undefined) ??
        (typeof anyRes === "string" ? (anyRes as unknown as string) : undefined) ??
        "";
    return { reply } as { reply: string };
}
