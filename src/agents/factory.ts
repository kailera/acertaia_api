import { openai } from "@ai-sdk/openai";
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { makeQdrantRetriever } from "../retriever/qdrant-retriever";

import type { AgentType } from "@prisma/client";
import type { Tool } from "@voltagent/core";
import {
	financeiroConfirmPayment,
	financeiroEmitCharge,
	financeiroGetPaymentStatus,
	logisticaTool,
	sdrCreateLead,
	sdrLogInteraction,
	sdrUpdateStage,
	secretariaGetEnrollmentStatus,
	secretariaListRequirements,
	secretariaUpsertEnrollment,
} from "../tools";

import { prisma } from "../utils/prisma";

// biome-ignore lint/suspicious/noExplicitAny: generic tool mapping
const TOOLS_BY_TYPE: Partial<Record<AgentType, Tool<any, any>[]>> = {
	SECRETARIA: [
		secretariaUpsertEnrollment,
		secretariaGetEnrollmentStatus,
		secretariaListRequirements,
	],
	FINANCEIRO: [
		financeiroEmitCharge,
		financeiroConfirmPayment,
		financeiroGetPaymentStatus,
	],
	SDR: [sdrCreateLead, sdrUpdateStage, sdrLogInteraction],
	LOGISTICA: [logisticaTool],
};

// biome-ignore lint/suspicious/noExplicitAny: generic tool mapping
function toolsForType(tipo: AgentType): Tool<any, any>[] {
	return TOOLS_BY_TYPE[tipo] ?? [];
}

async function buildInstructions(agentId: string) {
	const agent = await prisma.agent.findUnique({ where: { id: agentId } });
	if (!agent) throw new Error("agent not found");

	let persona = agent.persona ?? "";
	if (!persona && agent.parentId && agent.herdaPersonaDoPai) {
		const parent = await prisma.agent.findUnique({
			where: { id: agent.parentId },
		});
		if (parent?.persona) persona = parent.persona;
	}

	// (opcional) incorporar títulos das RULE_OVERRIDE
	const ruleLinks: Array<{ document: { name: string } }> =
		await prisma.agentDocument.findMany({
			where: { agentId, role: "RULE_OVERRIDE" },
			include: { document: true },
		});
	const rulesText = ruleLinks
		.map((l) => `\n[REGRA: ${l.document.name}]`)
		.join("");

	return `${persona}${rulesText}`;
}

export async function buildAgentFromDB(agentId: string) {
	const row = await prisma.agent.findUnique({ where: { id: agentId } });
	if (!row) throw new Error("agent not found");

	const instructions = await buildInstructions(agentId);
	const tools = toolsForType(row.tipo);

	return new Agent({
		name: row.nome,
		description: `Agente ${row.tipo}`,
		instructions,
		llm: new VercelAIProvider(),
		model: openai("gpt-4o-mini"),
		tools,
		retriever: makeQdrantRetriever(row.id), // 🔑 RAG por agente
		subAgents: [],
		userContext: new Map([
			["environment", "production"],
			["agentId", row.id],
		]),
	});
}
