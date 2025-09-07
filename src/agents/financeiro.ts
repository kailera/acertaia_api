import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { FinanceiroScript } from "../scripts/financeiro-script";
import { scriptGeral } from "../scripts/geral";
import {
	financeiroCalcularMensalidades,
	financeiroGetPaymentHistory,
	financeiroGetScholarshipInfo,
	financeiroListAdditionalFees,
	financeiroListBoletos,
	financeiroListConvenios,
	financeiroRegisterNegotiation,
} from "../tools";
import { memoryStorage } from "../utils/memory";
import { openai } from "../utils/openai";

export const FinanceiroAgent = new Agent({
	name: "Fiona",
	instructions: `${FinanceiroScript} ${scriptGeral}`,
	llm: new VercelAIProvider(),
	model: openai("gpt-4o-mini"),
	tools: [
		financeiroCalcularMensalidades,
		financeiroListAdditionalFees,
		financeiroListBoletos,
		financeiroGetPaymentHistory,
		financeiroGetScholarshipInfo,
		financeiroListConvenios,
		financeiroRegisterNegotiation,
	],
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
    const anyRes = result as unknown as Record<string, unknown>;
    const reply =
        (anyRes?.reply as string | undefined) ??
        (anyRes?.text as string | undefined) ??
        (typeof anyRes === "string" ? (anyRes as unknown as string) : undefined) ??
        "";
    return { reply } as { reply: string };
}
