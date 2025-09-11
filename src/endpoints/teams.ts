import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../utils/auth";
import { prisma } from "../utils/prisma";

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

export const teamEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/teams",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const teams = await prisma.team.findMany({
				where: { tenantId: auth.tenantId },
			});
			return c.json(teams);
		},
		description: "[privada] lista times",
	},
	{
		path: "/api/teams",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { nome, name, color, ativo } = body as {
				nome?: string;
				name?: string;
				color?: string;
				ativo?: boolean;
			};
			if (!nome) {
				return c.json({ message: "nome is required" }, 400);
			}
			const created = await prisma.team.create({
				data: {
					nome,
					name: name ?? null,
					color: color ?? null,
					ativo: ativo ?? true,
					tenantId: auth.tenantId,
				},
			});
			return c.json(created, 201);
		},
		description: "[privada] cria time",
	},
	{
		path: "/api/teams/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const team = await prisma.team.findFirst({
				where: { id, tenantId: auth.tenantId },
				include: { membros: true },
			});
			if (!team) return c.json({ message: "not found" }, 404);
			return c.json(team);
		},
		description: "[privada] busca time por id",
	},
	{
		path: "/api/teams/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.team.findUnique({
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
			const { nome, name, color, ativo } = body as {
				nome?: string;
				name?: string;
				color?: string;
				ativo?: boolean;
			};
			const data: Record<string, unknown> = {};
			if (nome !== undefined) data.nome = nome;
			if (name !== undefined) data.name = name;
			if (color !== undefined) data.color = color;
			if (ativo !== undefined) data.ativo = ativo;
			if (Object.keys(data).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const updated = await prisma.team.update({ where: { id }, data });
			return c.json(updated);
		},
		description: "[privada] atualiza time",
	},
	{
		path: "/api/teams/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.team.findUnique({
				where: { id },
				select: { tenantId: true },
			});
			if (!existing || existing.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}
			await prisma.team.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove time",
	},
	{
		path: "/api/teams/:teamId/members",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const teamId = c.req.param("teamId");
			const team = await prisma.team.findFirst({
				where: { id: teamId, tenantId: auth.tenantId },
			});
			if (!team) return c.json({ message: "not found" }, 404);
			const members = await prisma.teamMember.findMany({
				where: { teamId, tenantId: auth.tenantId },
			});
			return c.json(members);
		},
		description: "[privada] lista membros do time",
	},
	{
		path: "/api/teams/:teamId/members",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const teamId = c.req.param("teamId");
			const team = await prisma.team.findFirst({
				where: { id: teamId, tenantId: auth.tenantId },
			});
			if (!team) return c.json({ message: "not found" }, 404);
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { userId, pos } = body as { userId?: string; pos?: number };
			if (!userId) {
				return c.json({ message: "userId is required" }, 400);
			}
			const created = await prisma.teamMember.create({
				data: {
					teamId,
					agentId: userId,
					tenantId: auth.tenantId,
					pos: pos ?? 0,
				},
			});
			return c.json(created, 201);
		},
		description: "[privada] adiciona membro ao time",
	},
	{
		path: "/api/teams/:teamId/members/:userId",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const teamId = c.req.param("teamId");
			const userId = c.req.param("userId");
			const member = await prisma.teamMember.findUnique({
				where: { teamId_agentId: { teamId, agentId: userId } },
			});
			if (!member || member.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}
			await prisma.teamMember.delete({
				where: { teamId_agentId: { teamId, agentId: userId } },
			});
			return c.json({ success: true });
		},
		description: "[privada] remove membro do time",
	},
];
