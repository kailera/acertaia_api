import type { AgentStatus, AgentType } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// ---- mapeadores (front -> enums do Prisma)
const mapTipo = (t: string): AgentType => {
	const map = {
		Secretária: "SECRETARIA",
		Financeiro: "FINANCEIRO",
		SDR: "SDR",
		Logística: "LOGISTICA",
	} as const;
	const res = map[t as keyof typeof map];
	if (!res) throw new Error(`tipo inválido: ${t}`);
	return res as AgentType;
};

const mapStatus = (s?: string): AgentStatus =>
	s === "PAUSADO" ? "PAUSADO" : s === "RASCUNHO" ? "RASCUNHO" : "ATIVO";

// se seus canais existem como enum Channel no Prisma, use as strings do enum do BD:
const mapChannel = (c: string) => {
	const map = {
		WhatsApp: "WHATSAPP",
		Web: "WEB",
		Instagram: "INSTAGRAM",
		Telefone: "TELEFONE",
		Email: "EMAIL",
		Telegram: "TELEGRAM",
		Facebook: "FACEBOOK",
	} as const;
	const res = map[c as keyof typeof map];
	if (!res) throw new Error(`canal inválido: ${c}`);
	return res; // string do enum do BD
};

// ---- mapeadores (BD -> rótulos da UI) para o GET
const tipoToLabel = (t: AgentType | string) => {
	switch (String(t)) {
		case "SECRETARIA":
			return "Secretária";
		case "FINANCEIRO":
			return "Financeiro";
		case "SDR":
			return "SDR";
		case "LOGISTICA":
			return "Logística";
		default:
			return "SDR";
	}
};
const channelToLabel = (c: string) => {
	switch (String(c)) {
		case "WHATSAPP":
			return "WhatsApp";
		case "WEB":
			return "Web";
		case "INSTAGRAM":
			return "Instagram";
		case "TELEFONE":
			return "Telefone";
		case "EMAIL":
			return "Email";
		case "TELEGRAM":
			return "Telegram";
		case "FACEBOOK":
			return "Facebook";
		default:
			return c;
	}
};

// ---- validação do payload
const AgentCreatePayload = z.object({
	nome: z.string().min(1),
	tipo: z.string(),
	status: z.string().optional(),
	parentId: z.string().optional().nullable(),
	persona: z.string().optional().nullable(),
	herdaPersonaDoPai: z.boolean().optional(),
	canais: z.array(z.string()).optional(), // ["WhatsApp", ...]
	userId: z.string().optional(), // só como fallback; prefira header/sessão
});

export const agentEndpoints: CustomEndpointDefinition[] = [
	// ===== GET /api/agents (lista) =====
	{
		path: "/api/agents",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id"); // opcional: filtra por dono
			const where = userId ? { ownerId: userId } : undefined;

			const rows = await prisma.agent.findMany({
				where,
				include: { canais: true },
				orderBy: { createdAt: "asc" },
			});

			const data = rows.map((a) => ({
				id: a.id,
				nome: a.nome,
				tipo: tipoToLabel(a.tipo), // enum BD -> rótulo da UI
				status: a.status, // 'ATIVO' | 'PAUSADO' | 'RASCUNHO'
				parentId: a.parentId,
				persona: a.persona ?? undefined,
				herdaPersonaDoPai: !!a.herdaPersonaDoPai,
				canais: a.canais.map((c) => channelToLabel(c.channel)),
			}));

			return c.json(data);
		},
		description: "[privada] lista agentes",
	},

	// ===== POST /api/agents (cria) =====
	{
		path: "/api/agents",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const body = await c.req.json();
			const parsed = AgentCreatePayload.safeParse(body);
			if (!parsed.success) {
				return c.json({ success: false, message: parsed.error.message }, 400);
			}
			const p = parsed.data;

			// ⚠️ obtenha userId de forma segura (sessão/token). Aqui leio do header:
			const userId = c.req.header("x-user-id") ?? p.userId;
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			// valida parent, se enviado
			if (p.parentId) {
				const parent = await prisma.agent.findUnique({
					where: { id: p.parentId },
				});
				if (!parent)
					return c.json({ success: false, message: "parentId inválido" }, 400);
			}

			// mapeia enums
			let tipoEnum: AgentType;
			let statusEnum: AgentStatus;
			try {
				tipoEnum = mapTipo(p.tipo);
				statusEnum = mapStatus(p.status);
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Unknown error";
				return c.json({ success: false, message }, 400);
			}

			// 1) cria o agente (usar ownerId direto evita conflito de variantes no create)
			const created = await prisma.agent.create({
				data: {
					nome: p.nome,
					tipo: tipoEnum,
					status: statusEnum,
					parentId: p.parentId ?? null,
					persona: p.persona ?? null,
					herdaPersonaDoPai: !!p.herdaPersonaDoPai,
					ownerId: userId,
				},
			});

			// 2) cria canais à parte
			if (p.canais?.length) {
				await prisma.agentChannel.createMany({
					data: p.canais.map((label) => ({
						agentId: created.id,
						channel: mapChannel(label),
					})),
					skipDuplicates: true,
				});
			}

			return c.json({ success: true, data: created }, 201);
		},
		description: "[privada] cria agente",
	},
];
