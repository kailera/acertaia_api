import type { EndoItemType, EndoStatus, Prisma } from "@prisma/client";
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

export const endoItemEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/endo/items",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const tipo = c.req.query("tipo");
			const status = c.req.query("status");
			const expiraFrom = c.req.query("expiraFrom");
			const expiraTo = c.req.query("expiraTo");

			const where: Prisma.EndoItemWhereInput = {
				tenantId: auth.tenantId,
			};

			if (tipo) where.tipo = tipo as EndoItemType;
			if (status) where.status = status as EndoStatus;

			if (expiraFrom || expiraTo) {
				where.expiraEm = {};
				if (expiraFrom) {
					const date = new Date(expiraFrom);
					if (!Number.isNaN(date.getTime())) where.expiraEm.gte = date;
				}
				if (expiraTo) {
					const date = new Date(expiraTo);
					if (!Number.isNaN(date.getTime())) where.expiraEm.lte = date;
				}
			}

			const items = await prisma.endoItem.findMany({
				where,
				orderBy: { criadoEm: "desc" },
			});
			return c.json(items);
		},
		description: "[privada] lista itens de endomarketing",
	},
	{
		path: "/api/endo/items",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const { tipo, mensagem, status, expiraEm } = body as {
				tipo?: string;
				mensagem?: string;
				status?: string;
				expiraEm?: string;
			};

			if (!tipo || !mensagem) {
				return c.json({ message: "tipo e mensagem são obrigatórios" }, 400);
			}

			const data: Prisma.EndoItemUncheckedCreateInput = {
				tenantId: auth.tenantId,
				tipo: tipo as EndoItemType,
				mensagem,
				status: status ? (status as EndoStatus) : undefined,
				expiraEm: expiraEm ? new Date(expiraEm) : undefined,
			};

			const created = await prisma.endoItem.create({ data });
			return c.json(created, 201);
		},
		description: "[privada] cria item de endomarketing",
	},
	{
		path: "/api/endo/items/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const item = await prisma.endoItem.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!item) return c.json({ message: "not found" }, 404);
			return c.json(item);
		},
		description: "[privada] obtém item de endomarketing",
	},
	{
		path: "/api/endo/items/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.endoItem.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const { tipo, mensagem, status, expiraEm } = body as {
				tipo?: string;
				mensagem?: string;
				status?: string;
				expiraEm?: string;
			};

			const data: Prisma.EndoItemUncheckedUpdateInput = {};
			if (tipo !== undefined) data.tipo = tipo as EndoItemType;
			if (mensagem !== undefined) data.mensagem = mensagem;
			if (status !== undefined) data.status = status as EndoStatus;
			if (expiraEm !== undefined) {
				const date = new Date(expiraEm);
				if (!Number.isNaN(date.getTime())) {
					data.expiraEm = date;
				}
			}

			const updated = await prisma.endoItem.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza item de endomarketing",
	},
	{
		path: "/api/endo/items/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.endoItem.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			await prisma.endoItem.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove item de endomarketing",
	},
];

export default endoItemEndpoints;
