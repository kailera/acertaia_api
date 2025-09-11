import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../utils/auth";
import { prisma } from "../utils/prisma";

const prismaDeal = prisma as unknown as {
	deal: {
		findMany: (args: unknown) => Promise<unknown>;
		findFirst: (args: unknown) => Promise<unknown>;
		create: (args: unknown) => Promise<unknown>;
		update: (args: unknown) => Promise<unknown>;
		delete: (args: unknown) => Promise<unknown>;
	};
};

interface DealWhere extends Record<string, unknown> {
	closedAt?: { gte?: Date; lte?: Date };
}

async function requireAuthHeaders(
	c: Context,
): Promise<{ tenantId: string } | Response> {
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
	return { tenantId };
}

export const dealEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/deals",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const status = c.req.query("status") || undefined;
			const sellerId = c.req.query("sellerId") || undefined;
			const closedFrom = c.req.query("closedFrom");
			const closedTo = c.req.query("closedTo");

			const where: DealWhere = { tenantId: auth.tenantId };
			if (status) where.status = status;
			if (sellerId) where.sellerId = sellerId;
			if (closedFrom || closedTo) {
				where.closedAt = {};
				if (closedFrom) where.closedAt.gte = new Date(closedFrom);
				if (closedTo) where.closedAt.lte = new Date(closedTo);
			}
			const deals = await prismaDeal.deal.findMany({ where });
			return c.json(deals);
		},
		description: "[privada] lista deals",
	},
	{
		path: "/api/deals",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { leadId, status, sellerId, closedAt } = body as {
				leadId?: string;
				status?: string;
				sellerId?: string;
				closedAt?: string;
			};
			if (!leadId) {
				return c.json({ message: "leadId is required" }, 400);
			}
			const existing = await prismaDeal.deal.findFirst({
				where: { tenantId: auth.tenantId, leadId },
			});
			if (existing) {
				return c.json({ message: "leadId already in use" }, 409);
			}
			const data: Record<string, unknown> = {
				leadId,
				tenantId: auth.tenantId,
			};
			if (status !== undefined) data.status = status;
			if (sellerId !== undefined) data.sellerId = sellerId;
			if (closedAt !== undefined)
				data.closedAt = closedAt ? new Date(closedAt) : undefined;
			const created = await prismaDeal.deal.create({ data });
			return c.json(created, 201);
		},
		description: "[privada] cria deal",
	},
	{
		path: "/api/deals/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const deal = await prismaDeal.deal.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!deal) return c.json({ message: "not found" }, 404);
			return c.json(deal);
		},
		description: "[privada] busca deal por id",
	},
	{
		path: "/api/deals/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prismaDeal.deal.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { leadId, status, sellerId, closedAt } = body as {
				leadId?: string;
				status?: string;
				sellerId?: string;
				closedAt?: string;
			};
			if (leadId !== undefined) {
				const other = await prismaDeal.deal.findFirst({
					where: {
						tenantId: auth.tenantId,
						leadId,
						NOT: { id },
					},
				});
				if (other) {
					return c.json({ message: "leadId already in use" }, 409);
				}
			}
			const data: Record<string, unknown> = {};
			if (leadId !== undefined) data.leadId = leadId;
			if (status !== undefined) data.status = status;
			if (sellerId !== undefined) data.sellerId = sellerId;
			if (closedAt !== undefined)
				data.closedAt = closedAt ? new Date(closedAt) : undefined;
			if (Object.keys(data).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const updated = await prismaDeal.deal.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza deal",
	},
	{
		path: "/api/deals/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prismaDeal.deal.findFirst({
				where: { id, tenantId: auth.tenantId },
				select: { id: true },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			await prismaDeal.deal.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove deal",
	},
];
