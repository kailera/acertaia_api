import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { FinanceiroScript } from "../scripts/financeiro-script";
import { scriptGeral } from "../scripts/geral";
import { financeiroCalcularMensalidades } from "../tools";
import { memoryStorage } from "../utils/memory";
import { openai } from "../utils/openai";

export const FinanceiroAgent = new Agent({
	name: "Fiona",
	instructions: `${FinanceiroScript} ${scriptGeral}`,
	llm: new VercelAIProvider(),
	model: openai("gpt-4o-mini"),
	tools: [financeiroCalcularMensalidades],
	subAgents: [],
	purpose: "Agente financeiro que gerencia pagamentos e recebimentos",
	userContext: new Map([["environment", "production"]]),
	memory: memoryStorage,
});

export async function FinanceiroChat(
	input: string,
	userId: string,
	conversationId: string,
) {
	console.log(`User: ${input}`);
	const result = await FinanceiroAgent.generateText(input, {
		userId,
		conversationId,
	});
	return result;
}
