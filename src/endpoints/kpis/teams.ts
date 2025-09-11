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

export const teamKpiDailyEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/kpis/teams/daily",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const dateFrom = c.req.query("dateFrom");
			const dateTo = c.req.query("dateTo");
			const teamId = c.req.query("teamId") || undefined;

			const where: Prisma.TeamKpiDailyWhereInput = {
				tenantId: auth.tenantId,
			};

			if (teamId) where.teamId = teamId;
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

			const records = await prisma.teamKpiDaily.findMany({
				where,
				orderBy: { date: "desc" },
			});
			return c.json(records);
		},
		description: "[privada] lista KPI diários de times",
	},
	{
		path: "/api/kpis/teams/daily",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const { date, teamId, primeiraRespMin, leadsRecebidos } = body as {
				date?: string;
				teamId?: string;
				primeiraRespMin?: number;
				leadsRecebidos?: number;
			};

			if (!date || !teamId) {
				return c.json({ message: "date and teamId are required" }, 400);
			}

			const created = await prisma.teamKpiDaily.create({
				data: {
					tenantId: auth.tenantId,
					date: new Date(date),
					teamId,
					primeiraRespMin: primeiraRespMin ?? 0,
					leadsRecebidos: leadsRecebidos ?? 0,
				},
			});
			return c.json(created, 201);
		},
		description: "[privada] cria KPI diário de time",
	},
	{
		path: "/api/kpis/teams/daily/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const record = await prisma.teamKpiDaily.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!record) return c.json({ message: "not found" }, 404);
			return c.json(record);
		},
		description: "[privada] busca KPI diário de time",
	},
	{
		path: "/api/kpis/teams/daily/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.teamKpiDaily.findUnique({
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

			const { date, teamId, primeiraRespMin, leadsRecebidos } = body as {
				date?: string;
				teamId?: string;
				primeiraRespMin?: number;
				leadsRecebidos?: number;
			};

			const data: Prisma.TeamKpiDailyUpdateInput = {};
			if (date !== undefined) {
				const d = new Date(date);
				if (!Number.isNaN(d.getTime())) data.date = d;
			}
			if (teamId !== undefined) data.team = { connect: { id: teamId } };
			if (primeiraRespMin !== undefined) data.primeiraRespMin = primeiraRespMin;
			if (leadsRecebidos !== undefined) data.leadsRecebidos = leadsRecebidos;

			if (Object.keys(data).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}

			const updated = await prisma.teamKpiDaily.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza KPI diário de time",
	},
	{
		path: "/api/kpis/teams/daily/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.teamKpiDaily.findUnique({
				where: { id },
				select: { tenantId: true },
			});
			if (!existing || existing.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}

			await prisma.teamKpiDaily.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove KPI diário de time",
	},
];
