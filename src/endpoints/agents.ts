import { randomUUID } from "node:crypto";
import type { AgentStatus, AgentType, Prisma } from "@prisma/client";
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

const AgentUpdatePayload = AgentCreatePayload.partial();
const AgentStatusPayload = z.object({ status: z.string() });
const AgentChatPayload = z.object({
	input: z.string().min(1),
	conversationId: z.string().optional(),
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

	// ===== PUT /api/agents/:id (atualiza) =====
	{
		path: "/api/agents/:id",
		method: "put" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const body = await c.req.json();
			const parsed = AgentUpdatePayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);
			const p = parsed.data;

			const exists = await prisma.agent.findFirst({
				where: { id, ownerId: userId },
			});
			if (!exists) return c.json({ success: false, message: "not found" }, 404);

			const data: Prisma.AgentUncheckedUpdateInput = {};
			try {
				if (p.nome) data.nome = p.nome;
				if (p.tipo) data.tipo = mapTipo(p.tipo);
				if (p.status) data.status = mapStatus(p.status);
				if (p.parentId !== undefined) data.parentId = p.parentId ?? null;
				if (p.persona !== undefined) data.persona = p.persona ?? null;
				if (p.herdaPersonaDoPai !== undefined)
					data.herdaPersonaDoPai = !!p.herdaPersonaDoPai;
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : "Unknown error";
				return c.json({ success: false, message }, 400);
			}

			const updated = await prisma.agent.update({ where: { id }, data });

			if (p.canais) {
				await prisma.agentChannel.deleteMany({ where: { agentId: id } });
				if (p.canais.length) {
					await prisma.agentChannel.createMany({
						data: p.canais.map((label) => ({
							agentId: id,
							channel: mapChannel(label),
						})),
						skipDuplicates: true,
					});
				}
			}

			return c.json({ success: true, data: updated });
		},
		description: "[privada] atualiza agente",
	},

	// ===== PATCH /api/agents/:id/status (ativa/pausa) =====
	{
		path: "/api/agents/:id/status",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const body = await c.req.json();
			const parsed = AgentStatusPayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);

			const exists = await prisma.agent.findFirst({
				where: { id, ownerId: userId },
			});
			if (!exists) return c.json({ success: false, message: "not found" }, 404);

			const statusEnum = mapStatus(parsed.data.status);
			await prisma.agent.update({
				where: { id },
				data: { status: statusEnum },
			});

			return c.json({ success: true });
		},
		description: "[privada] altera status do agente",
	},

	// ===== DELETE /api/agents/:id (remove) =====
	{
		path: "/api/agents/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const exists = await prisma.agent.findFirst({
				where: { id, ownerId: userId },
			});
			if (!exists) return c.json({ success: false, message: "not found" }, 404);

			await prisma.agentChannel.deleteMany({ where: { agentId: id } });
			await prisma.agentDocument.deleteMany({ where: { agentId: id } });
			await prisma.agent.delete({ where: { id } });

			return c.json({ success: true });
		},
		description: "[privada] remove agente",
	},

	// ===== POST /api/agents/:id/duplicate (duplica) =====
	{
		path: "/api/agents/:id/duplicate",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const base = await prisma.agent.findFirst({
				where: { id, ownerId: userId },
				include: { canais: true },
			});
			if (!base) return c.json({ success: false, message: "not found" }, 404);

			const created = await prisma.agent.create({
				data: {
					nome: `${base.nome} (cópia)`,
					tipo: base.tipo,
					status: "RASCUNHO",
					parentId: base.parentId,
					persona: base.persona,
					herdaPersonaDoPai: base.herdaPersonaDoPai,
					ownerId: userId,
				},
			});

			if (base.canais.length) {
				await prisma.agentChannel.createMany({
					data: base.canais.map((c) => ({
						agentId: created.id,
						channel: c.channel,
					})),
					skipDuplicates: true,
				});
			}

			return c.json({ success: true, data: { id: created.id } }, 201);
		},
		description: "[privada] duplica agente",
	},

	// ===== POST /api/agents/:id/chat =====
	{
		path: "/api/agents/:id/chat",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const agent = await prisma.agent.findFirst({
				where: { id, ownerId: userId },
			});
			if (!agent) return c.json({ success: false, message: "not found" }, 404);

			const body = await c.req.json();
			const parsed = AgentChatPayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);

			const { buildAgentFromDB } = await import("../agents/factory");
			const agentInstance = await buildAgentFromDB(id);
			const convId =
				parsed.data.conversationId && parsed.data.conversationId.length > 0
					? parsed.data.conversationId
					: randomUUID();
			const result = await agentInstance.generateText(parsed.data.input, {
				userId,
				conversationId: convId,
			});

			return c.json(
				{ success: true, data: { ...result, conversationId: convId } },
				201,
			);
		},
		description: "[privada] chat com agente usando tools",
	},
];
