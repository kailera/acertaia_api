import { createTool } from "@voltagent/core";
import { z } from "zod";
import { createLead } from "../../repositories/lead-repository";

export const sdrCreateLead = createTool({
	name: "sdr_create_lead",
	description: "cria um lead com informações básicas",
        parameters: z.object({
                tenantId: z.string().describe("identificador do tenant"),
                email: z.string().email().describe("email do lead"),
                name: z.string().optional().describe("nome do lead"),
                phone: z.string().optional().describe("telefone de contato"),
                channel: z.string().optional().describe("canal de origem"),
                campaignId: z.string().optional().describe("campanha associada"),
        }),
        execute: async ({ tenantId, email, name, phone, channel, campaignId }) => {
                const lead = await createLead({
                        firstName: name,
                        email,
                        phone,
                        campaignId,
                        tenantId,
                });
                return { ok: true, leadId: lead.id, stage: lead.status };
        },
});

export const sdrUpdateStage = createTool({
	name: "sdr_update_stage",
	description: "atualiza o estágio de um lead",
	parameters: z.object({
		leadId: z.string().describe("identificador do lead"),
		stage: z
			.enum(["CONTACTED", "QUALIFIED", "SCHEDULED", "WON", "LOST"])
			.describe("novo estágio"),
		notes: z.string().optional().describe("observações"),
	}),
	execute: async ({ leadId, stage, notes }) => {
		// TODO: atualizar estágio no Postgres
		return { ok: true, leadId, stage };
	},
});

export const sdrLogInteraction = createTool({
	name: "sdr_log_interaction",
	description: "registra uma interação com o lead",
	parameters: z.object({
		leadId: z.string().describe("identificador do lead"),
		type: z
			.enum(["WHATSAPP", "CALL", "EMAIL", "OTHER"])
			.describe("tipo de interação"),
		note: z.string().describe("descrição da interação"),
	}),
	execute: async ({ leadId, type, note }) => {
		// TODO: registrar interação no Postgres
		return { ok: true };
	},
});
