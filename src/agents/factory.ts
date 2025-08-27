import { openai } from "@ai-sdk/openai";
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { makeQdrantRetriever } from "../retriever/qdrant-retriever";
import { createLeadTool } from "../tools/sdr";
import { registrationStudentsTool } from "../tools/secretary"; // exemplo
import { prisma } from "../utils/prisma";

function toolsForType(tipo: string) {
	switch (tipo) {
		case "SECRETARIA":
			return [registrationStudentsTool];
		case "SDR":
			return [createLeadTool];
		default:
			return [];
	}
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
	const ruleLinks = await prisma.agentDocument.findMany({
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
