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

	return result;
}
