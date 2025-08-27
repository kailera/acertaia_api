import { createTool } from "@voltagent/core";
import { z } from "zod";

export const sdrLeadTool = createTool({
	name: "qualifyLead",
	description: "Ferramenta de exemplo para qualificação de leads",
	parameters: z.object({
		leadName: z.string().describe("nome do lead"),
	}),
	execute: async ({ leadName }) => {
		return { result: `Lead ${leadName} qualificado` };
	},
});

// lead creation tool for SDR agents
export const createLeadTool = createTool({
	name: "create_lead",
	description: "cria um lead de vendas com as informações básicas de contato",
	parameters: z.object({
		name: z.string().describe("nome completo do lead"),
		email: z.string().email().optional().describe("email de contato"),
		company: z.string().optional().describe("empresa do lead"),
		campaignId: z
			.string()
			.optional()
			.describe("identificador da campanha de origem"),
	}),
	execute: async (args) => {
		const campaignId = args.campaignId ?? "DEFAULT";
		try {
			// Aqui poderia ser realizada uma chamada ao banco de dados ou API externa
			const result = `lead criado: ${args.name} <${args.email}>${
				args.company ? ` (${args.company})` : ""
			} [${campaignId}]`;
			return { result };
		} catch (error) {
			// trata erro de unicidade do email se vier do banco
			if (
				error instanceof Error &&
				"code" in error &&
				(error as { code: string }).code === "P2002"
			) {
				throw new Error("Email já cadastrado");
			}
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Erro na criação do lead: ${message}`);
		}
	},
});
