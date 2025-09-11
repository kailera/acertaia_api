import type { Prisma } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../utils/auth";
import { prisma } from "../utils/prisma";
import { ok } from "../utils/response";

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

export const slaConfigEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/sla-configs",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const configs = await prisma.slaConfig.findMany({
				where: { tenantId: auth.tenantId },
			});
			return c.json(ok(configs));
		},
		description: "[privada] lista configurações de SLA",
	},
	{
		path: "/api/sla-configs",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { name, config, active } = body as {
				name?: string;
				config?: Prisma.InputJsonValue;
				active?: boolean;
			};
			if (active) {
				const exists = await prisma.slaConfig.findFirst({
					where: { tenantId: auth.tenantId, active: true },
				});
				if (exists) {
					return c.json({ message: "active config already exists" }, 400);
				}
			}
			const created = await prisma.slaConfig.create({
				data: {
					tenantId: auth.tenantId,
					name: name ?? null,
					config: config ?? null,
					active: active ?? false,
				},
			});
			return c.json(ok(created), 201);
		},
		description: "[privada] cria configuração de SLA",
	},
	{
		path: "/api/sla-configs/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const config = await prisma.slaConfig.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!config) return c.json({ message: "not found" }, 404);
			return c.json(ok(config));
		},
		description: "[privada] busca configuração de SLA",
	},
	{
		path: "/api/sla-configs/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { name, config, active } = body as {
				name?: string;
				config?: Prisma.InputJsonValue;
				active?: boolean;
			};
			const data: Record<string, unknown> = {};
			if (typeof name !== "undefined") data.name = name;
			if (typeof config !== "undefined") data.config = config;
			if (typeof active !== "undefined") {
				if (active) {
					const exists = await prisma.slaConfig.findFirst({
						where: {
							tenantId: auth.tenantId,
							active: true,
							NOT: { id },
						},
					});
					if (exists) {
						return c.json({ message: "active config already exists" }, 400);
					}
				}
				data.active = active;
			}
			if (Object.keys(data).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const existing = await prisma.slaConfig.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			const updated = await prisma.slaConfig.update({ where: { id }, data });
			return c.json(ok(updated));
		},
		description: "[privada] atualiza configuração de SLA",
	},
	{
		path: "/api/sla-configs/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.slaConfig.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			await prisma.slaConfig.delete({ where: { id } });
			return c.json(ok({ success: true }));
		},
		description: "[privada] remove configuração de SLA",
	},
	{
		path: "/api/sla-configs/current",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const config = await prisma.slaConfig.findFirst({
				where: { tenantId: auth.tenantId, active: true },
			});
			if (!config) return c.json({ message: "not found" }, 404);
			return c.json(ok(config));
		},
		description: "[privada] busca configuração de SLA ativa",
	},
];
