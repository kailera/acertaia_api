import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { scriptGeral } from "../scripts/geral";
import { LogisticaScript } from "../scripts/logistica-script";
import { memoryStorage } from "../utils/memory";
import { openai } from "../utils/openai";

export const LogisticaAgent = new Agent({
	name: "Leo",
	instructions: `${LogisticaScript} ${scriptGeral}`,
	llm: new VercelAIProvider(),
	model: openai("gpt-4o-mini"),
	tools: [],
	subAgents: [],
	purpose: "Agente de logística para acompanhar entregas e estoque",
	userContext: new Map([["environment", "production"]]),
	memory: memoryStorage,
});

export async function LogisticaChat(
    input: string,
    userId: string,
    conversationId: string,
) {
    console.log(`User: ${input}`);
    const result = await LogisticaAgent.generateText(input, {
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
