import type {
	LeadInteractionType,
	LeadStage,
	LeadStatus,
	Prisma,
} from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../utils/auth";
import { prisma } from "../utils/prisma";

async function requireAuthHeaders(
	c: Context,
): Promise<{ tenantId: string; userId: string } | Response> {
	const userId = await getUserIdFromHeaders(c);
	if (!userId) {
		return c.json({ message: "missing or invalid Authorization header" }, 401);
	}
	const tenantId = c.req.header("x-tenant-id") || c.req.header("X-Tenant-Id");
	if (!tenantId) {
		return c.json({ message: "missing X-Tenant-Id header" }, 400);
	}
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { tenantId: true },
	});
	if (!user || user.tenantId !== tenantId) {
		return c.json({ message: "forbidden" }, 403);
	}
	return { tenantId, userId };
}

function parseInclude(param: string | undefined): string[] {
	if (!param) return [];
	return param
		.split(",")
		.map((p) => p.trim())
		.filter(Boolean);
}

export const leadEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/leads",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const q = c.req.query("q") || undefined;
			const status = c.req.query("status") || undefined;
			const stage = c.req.query("stage") || undefined;
			const assignedToId = c.req.query("assignedToId") || undefined;
			const campaignId = c.req.query("campaignId") || undefined;
			const createdFrom = c.req.query("createdFrom");
			const createdTo = c.req.query("createdTo");
			const includeFields = parseInclude(c.req.query("include"));

			const where: Prisma.LeadWhereInput = {
				tenantId: auth.tenantId,
			} as unknown as Prisma.LeadWhereInput;
			if (status)
				(where as unknown as { status: LeadStatus }).status =
					status as LeadStatus;
			if (stage)
				(where as unknown as { stage: LeadStage }).stage = stage as LeadStage;
			if (assignedToId)
				(where as unknown as { assignedToId: string }).assignedToId =
					assignedToId;
			if (campaignId)
				(where as unknown as { campaignId: string }).campaignId = campaignId;
			if (q) {
				where.OR = [
					{ firstName: { contains: q, mode: "insensitive" } },
					{ lastName: { contains: q, mode: "insensitive" } },
					{ email: { contains: q, mode: "insensitive" } },
					{ phone: { contains: q } },
				];
			}
			if (createdFrom || createdTo) {
				where.capturedAt = {};
				if (createdFrom) where.capturedAt.gte = new Date(createdFrom);
				if (createdTo) where.capturedAt.lte = new Date(createdTo);
			}

			const include: Prisma.LeadInclude = {};
			if (includeFields.includes("assignedTo")) include.assignedTo = true;
			if (includeFields.includes("campaign")) include.campaign = true;
			if (includeFields.includes("interactions")) include.interactions = true;
			if (includeFields.includes("contact")) include.contact = true;
			if (includeFields.includes("team")) include.team = true;
			if (includeFields.includes("stageHistory"))
				(include as unknown as { stageHistory: boolean }).stageHistory = true;

			const leads = await prisma.lead.findMany({
				where,
				...(includeFields.length > 0 ? { include } : {}),
			});
			return c.json(leads);
		},
		description: "[privada] lista leads",
	},
	{
		path: "/api/leads",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { firstName, lastName, email, phone, campaignId, status, stage } =
				body as {
					firstName?: string;
					lastName?: string;
					email?: string;
					phone?: string;
					campaignId?: string;
					status?: string;
					stage?: string;
				};
			const data: Prisma.LeadCreateInput = {
				firstName,
				lastName,
				email,
				phone,
				campaignId: campaignId || "DEFAULT",
				tenantId: auth.tenantId,
				...(status ? { status: status as LeadStatus } : {}),
				...(stage ? { stage: stage as LeadStage } : {}),
			} as unknown as Prisma.LeadCreateInput;
			const created = await prisma.lead.create({ data });
			return c.json(created, 201);
		},
		description: "[privada] cria lead",
	},
	{
		path: "/api/leads/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const includeFields = parseInclude(c.req.query("include"));
			const include: Prisma.LeadInclude = {};
			if (includeFields.includes("assignedTo")) include.assignedTo = true;
			if (includeFields.includes("campaign")) include.campaign = true;
			if (includeFields.includes("interactions")) include.interactions = true;
			if (includeFields.includes("contact")) include.contact = true;
			if (includeFields.includes("team")) include.team = true;
			if (includeFields.includes("stageHistory"))
				(include as unknown as { stageHistory: boolean }).stageHistory = true;
			const lead = await prisma.lead.findFirst({
				where: { id, tenantId: auth.tenantId },
				...(includeFields.length > 0 ? { include } : {}),
			});
			if (!lead) return c.json({ message: "not found" }, 404);
			return c.json(lead);
		},
		description: "[privada] busca lead por id",
	},
	{
		path: "/api/leads/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.lead.findFirst({
				where: { id, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const {
				firstName,
				lastName,
				email,
				phone,
				status,
				stage,
				assignedToId,
				campaignId,
				probability,
			} = body as {
				firstName?: string;
				lastName?: string;
				email?: string;
				phone?: string;
				status?: string;
				stage?: string;
				assignedToId?: string;
				campaignId?: string;
				probability?: number;
			};
			const data: Prisma.LeadUpdateInput =
				{} as unknown as Prisma.LeadUpdateInput;
			if (firstName !== undefined) data.firstName = firstName;
			if (lastName !== undefined) data.lastName = lastName;
			if (email !== undefined) data.email = email;
			if (phone !== undefined) data.phone = phone;
			if (status !== undefined)
				(data as unknown as { status: LeadStatus }).status =
					status as LeadStatus;
			if (stage !== undefined)
				(data as unknown as { stage: LeadStage }).stage = stage as LeadStage;
			if (assignedToId !== undefined)
				(data as unknown as { assignedToId: string | null }).assignedToId =
					assignedToId || null;
			if (campaignId !== undefined)
				(data as unknown as { campaignId: string }).campaignId = campaignId;
			if (probability !== undefined)
				(data as unknown as { probability: number | undefined }).probability =
					probability;
			if (Object.keys(data as object).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const updated = await prisma.lead.update({ where: { id }, data });
			return c.json(updated);
		},
		description: "[privada] atualiza lead",
	},
	{
		path: "/api/leads/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.lead.findFirst({
				where: { id, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			await prisma.lead.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove lead",
	},
	{
		path: "/api/leads/:id/assign",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { userId } = body as { userId?: string };
			if (!userId) return c.json({ message: "userId is required" }, 400);
			const lead = await prisma.lead.findFirst({
				where: { id, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!lead) return c.json({ message: "not found" }, 404);
			const user = await prisma.user.findFirst({
				where: { id: userId, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!user) return c.json({ message: "user not found" }, 404);
			const updated = await prisma.lead.update({
				where: { id },
				data: { assignedToId: userId },
			});
			return c.json(updated);
		},
		description: "[privada] atribui lead a um usuário",
	},
	{
		path: "/api/leads/:id/transition",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { stage, note } = body as { stage?: string; note?: string };
			if (!stage) return c.json({ message: "stage is required" }, 400);
			const lead = await prisma.lead.findFirst({
				where: { id, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!lead) return c.json({ message: "not found" }, 404);
			await prisma.$transaction([
				prisma.lead.update({
					where: { id },
					data: { stage: stage as LeadStage },
				}),
				// biome-ignore lint/suspicious/noExplicitAny: prisma extension lacks types
				(prisma as any).leadStageHistory.create({
					data: {
						leadId: id,
						stage,
						note,
						changedAt: new Date(),
					},
				}),
			]);
			return c.json({ success: true });
		},
		description: "[privada] registra transição de estágio do lead",
	},
	{
		path: "/api/leads/:leadId/interactions",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const leadId = c.req.param("leadId");
			const lead = await prisma.lead.findFirst({
				where: { id: leadId, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!lead) return c.json({ message: "not found" }, 404);
			const interactions = await prisma.leadInteraction.findMany({
				where: { leadId },
				orderBy: { timestamp: "desc" },
			});
			return c.json(interactions);
		},
		description: "[privada] lista interações do lead",
	},
	{
		path: "/api/leads/:leadId/interactions",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const leadId = c.req.param("leadId");
			const lead = await prisma.lead.findFirst({
				where: { id: leadId, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!lead) return c.json({ message: "not found" }, 404);
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { type, contentId } = body as {
				type?: string;
				contentId?: string;
			};
			if (!type) return c.json({ message: "type is required" }, 400);
			const data: Prisma.LeadInteractionCreateInput = {
				type: type as LeadInteractionType,
				lead: { connect: { id: leadId } },
				...(contentId ? { content: { connect: { id: contentId } } } : {}),
			} as unknown as Prisma.LeadInteractionCreateInput;
			const created = await prisma.leadInteraction.create({ data });
			await prisma.lead.update({
				where: { id: leadId },
				data: { lastInteractionAt: new Date() },
			});
			return c.json(created, 201);
		},
		description: "[privada] cria interação do lead",
	},
	{
		path: "/api/lead-interactions/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const interaction = await prisma.leadInteraction.findUnique({
				where: { id },
				include: { lead: { select: { tenantId: true } } },
			});
			if (!interaction || interaction.lead.tenantId !== auth.tenantId)
				return c.json({ message: "not found" }, 404);
			return c.json(interaction);
		},
		description: "[privada] busca interação do lead",
	},
	{
		path: "/api/lead-interactions/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const interaction = await prisma.leadInteraction.findUnique({
				where: { id },
				include: { lead: { select: { tenantId: true } } },
			});
			if (!interaction || interaction.lead.tenantId !== auth.tenantId)
				return c.json({ message: "not found" }, 404);
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { type, contentId } = body as {
				type?: string;
				contentId?: string | null;
			};
			const data: Prisma.LeadInteractionUpdateInput =
				{} as unknown as Prisma.LeadInteractionUpdateInput;
			if (type !== undefined)
				(data as unknown as { type: LeadInteractionType }).type =
					type as LeadInteractionType;
			if (contentId !== undefined)
				(data as unknown as { contentId: string | null }).contentId = contentId;
			if (Object.keys(data as object).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const updated = await prisma.leadInteraction.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza interação do lead",
	},
	{
		path: "/api/lead-interactions/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const interaction = await prisma.leadInteraction.findUnique({
				where: { id },
				include: { lead: { select: { tenantId: true } } },
			});
			if (!interaction || interaction.lead.tenantId !== auth.tenantId)
				return c.json({ message: "not found" }, 404);
			await prisma.leadInteraction.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove interação do lead",
	},
	{
		path: "/api/leads/:leadId/stages",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const leadId = c.req.param("leadId");
			const lead = await prisma.lead.findFirst({
				where: { id: leadId, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!lead) return c.json({ message: "not found" }, 404);
			// biome-ignore lint/suspicious/noExplicitAny: prisma extension lacks types
			const history = await (prisma as any).leadStageHistory.findMany({
				where: { leadId },
				orderBy: { changedAt: "desc" },
			});
			return c.json(history);
		},
		description: "[privada] lista histórico de estágios do lead",
	},
	{
		path: "/api/lead-stage-history/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			// biome-ignore lint/suspicious/noExplicitAny: prisma extension lacks types
			const entry = await (prisma as any).leadStageHistory.findUnique({
				where: { id },
				include: { lead: { select: { tenantId: true } } },
			});
			if (!entry || entry.lead.tenantId !== auth.tenantId)
				return c.json({ message: "not found" }, 404);
			return c.json(entry);
		},
		description: "[privada] busca histórico de estágio",
	},
	{
		path: "/api/lead-stage-history/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			// biome-ignore lint/suspicious/noExplicitAny: prisma extension lacks types
			const entry = await (prisma as any).leadStageHistory.findUnique({
				where: { id },
				include: { lead: { select: { tenantId: true } } },
			});
			if (!entry || entry.lead.tenantId !== auth.tenantId)
				return c.json({ message: "not found" }, 404);
			// biome-ignore lint/suspicious/noExplicitAny: prisma extension lacks types
			await (prisma as any).leadStageHistory.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove entrada de histórico de estágio",
	},
];
