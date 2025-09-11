import type { Prisma } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

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

export const sellerKpiDailyEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/kpis/sellers/daily",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const dateFrom = c.req.query("dateFrom");
			const dateTo = c.req.query("dateTo");
			const sellerId = c.req.query("sellerId") || undefined;

			const where: Prisma.SellerKpiDailyWhereInput = {
				tenantId: auth.tenantId,
			};

			if (sellerId) where.sellerId = sellerId;
			if (dateFrom || dateTo) {
				where.date = {};
				if (dateFrom) {
					const d = new Date(dateFrom);
					if (!Number.isNaN(d.getTime())) where.date.gte = d;
				}
				if (dateTo) {
					const d = new Date(dateTo);
					if (!Number.isNaN(d.getTime())) where.date.lte = d;
				}
			}

			const records = await prisma.sellerKpiDaily.findMany({
				where,
				orderBy: { date: "desc" },
			});
			return c.json(records);
		},
		description: "[privada] lista KPI diários de vendedores",
	},
	{
		path: "/api/kpis/sellers/daily",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const {
				date,
				sellerId,
				atendimentosDia,
				primeiraRespMin,
				conversaoPct,
				slaPct,
				receitaCents,
			} = body as {
				date?: string;
				sellerId?: string;
				atendimentosDia?: number;
				primeiraRespMin?: number;
				conversaoPct?: number;
				slaPct?: number;
				receitaCents?: number;
			};

			if (!date || !sellerId) {
				return c.json({ message: "date and sellerId are required" }, 400);
			}

			const created = await prisma.sellerKpiDaily.create({
				data: {
					tenantId: auth.tenantId,
					date: new Date(date),
					sellerId,
					atendimentosDia: atendimentosDia ?? 0,
					primeiraRespMin: primeiraRespMin ?? 0,
					conversaoPct: conversaoPct ?? 0,
					slaPct: slaPct ?? 0,
					receitaCents: receitaCents ?? 0,
				},
			});
			return c.json(created, 201);
		},
		description: "[privada] cria KPI diário de vendedor",
	},
	{
		path: "/api/kpis/sellers/daily/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const record = await prisma.sellerKpiDaily.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!record) return c.json({ message: "not found" }, 404);
			return c.json(record);
		},
		description: "[privada] busca KPI diário de vendedor",
	},
	{
		path: "/api/kpis/sellers/daily/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.sellerKpiDaily.findUnique({
				where: { id },
				select: { tenantId: true },
			});
			if (!existing || existing.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const {
				date,
				sellerId,
				atendimentosDia,
				primeiraRespMin,
				conversaoPct,
				slaPct,
				receitaCents,
			} = body as {
				date?: string;
				sellerId?: string;
				atendimentosDia?: number;
				primeiraRespMin?: number;
				conversaoPct?: number;
				slaPct?: number;
				receitaCents?: number;
			};

			const data: Prisma.SellerKpiDailyUpdateInput = {};
			if (date !== undefined) {
				const d = new Date(date);
				if (!Number.isNaN(d.getTime())) data.date = d;
			}
			if (sellerId !== undefined) data.seller = { connect: { id: sellerId } };
			if (atendimentosDia !== undefined) data.atendimentosDia = atendimentosDia;
			if (primeiraRespMin !== undefined) data.primeiraRespMin = primeiraRespMin;
			if (conversaoPct !== undefined) data.conversaoPct = conversaoPct;
			if (slaPct !== undefined) data.slaPct = slaPct;
			if (receitaCents !== undefined) data.receitaCents = receitaCents;

			if (Object.keys(data).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}

			const updated = await prisma.sellerKpiDaily.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza KPI diário de vendedor",
	},
	{
		path: "/api/kpis/sellers/daily/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.sellerKpiDaily.findUnique({
				where: { id },
				select: { tenantId: true },
			});
			if (!existing || existing.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}

			await prisma.sellerKpiDaily.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove KPI diário de vendedor",
	},
];
