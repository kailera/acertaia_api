import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { scriptGeral } from "../scripts/geral";
import { SecretaryScript } from "../scripts/secretary-script";
import {
	secretariaGetEnrollmentStatus,
	secretariaListRequirements,
	secretariaUpsertEnrollment,
} from "../tools";
import { memoryStorage } from "../utils/memory";
import { openai } from "../utils/openai";
import { FinanceiroAgent } from "./financeiro";

export const SecretaryAgent = new Agent({
	name: "Anne",
	instructions: `${SecretaryScript} ${scriptGeral}`,
	llm: new VercelAIProvider(),
	model: openai("gpt-4o-mini"),
	tools: [
		secretariaUpsertEnrollment,
		secretariaGetEnrollmentStatus,
		secretariaListRequirements,
	],
	subAgents: [FinanceiroAgent],
	purpose: "Agente de secretária que faz a gestão de documentos e matrículas",
	userContext: new Map([["environment", "production"]]),
	memory: memoryStorage,
});

// aquui é dado a resposta // retorne a resposta inteira e quebre em chunks
export async function SecretaryChat(
	input: string,
	userId: string,
	conversationId: string,
) {
	console.log(`User: ${input}`);
	// Use streamText for interactive responses
	const result = await SecretaryAgent.generateText(input, {
		userId,
		conversationId,
	});

	return result;
}
