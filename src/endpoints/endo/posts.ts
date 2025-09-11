import type { EndoItemType, Prisma } from "@prisma/client";
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

export const endoPostEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/endo/posts",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const tipo = c.req.query("tipo");
			const autor = c.req.query("autor");
			const publicadoFrom = c.req.query("publicadoFrom");
			const publicadoTo = c.req.query("publicadoTo");
			const q = c.req.query("q");

			const where: Prisma.EndoPostWhereInput = {
				tenantId: auth.tenantId,
			};

			if (tipo) where.tipo = tipo as EndoItemType;
			if (autor) where.autor = autor;

			if (publicadoFrom || publicadoTo) {
				where.publicadoEm = {};
				if (publicadoFrom) {
					const date = new Date(publicadoFrom);
					if (!Number.isNaN(date.getTime())) {
						where.publicadoEm.gte = date;
					}
				}
				if (publicadoTo) {
					const date = new Date(publicadoTo);
					if (!Number.isNaN(date.getTime())) {
						where.publicadoEm.lte = date;
					}
				}
			}

			if (q) {
				where.OR = [
					{ titulo: { contains: q, mode: "insensitive" } },
					{ corpo: { contains: q, mode: "insensitive" } },
				];
			}

			const posts = await prisma.endoPost.findMany({
				where,
				orderBy: { publicadoEm: "desc" },
			});
			return c.json(posts);
		},
		description: "[privada] lista posts de endomarketing",
	},
	{
		path: "/api/endo/posts",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const { tipo, titulo, corpo, autor, publicadoEm } = body as {
				tipo?: string;
				titulo?: string;
				corpo?: string;
				autor?: string;
				publicadoEm?: string;
			};

			if (!tipo || !titulo || !corpo || !autor) {
				return c.json(
					{ message: "tipo, titulo, corpo e autor são obrigatórios" },
					400,
				);
			}

			const data: Prisma.EndoPostUncheckedCreateInput = {
				tenantId: auth.tenantId,
				tipo: tipo as EndoItemType,
				titulo,
				corpo,
				autor,
				publicadoEm: publicadoEm ? new Date(publicadoEm) : undefined,
			};

			const created = await prisma.endoPost.create({ data });
			return c.json(created, 201);
		},
		description: "[privada] cria post de endomarketing",
	},
	{
		path: "/api/endo/posts/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const post = await prisma.endoPost.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!post) return c.json({ message: "not found" }, 404);
			return c.json(post);
		},
		description: "[privada] obtém post de endomarketing",
	},
	{
		path: "/api/endo/posts/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.endoPost.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}

			const { tipo, titulo, corpo, autor, publicadoEm } = body as {
				tipo?: string;
				titulo?: string;
				corpo?: string;
				autor?: string;
				publicadoEm?: string;
			};

			const data: Prisma.EndoPostUncheckedUpdateInput = {};
			if (tipo !== undefined) data.tipo = tipo as EndoItemType;
			if (titulo !== undefined) data.titulo = titulo;
			if (corpo !== undefined) data.corpo = corpo;
			if (autor !== undefined) data.autor = autor;
			if (publicadoEm !== undefined) {
				const date = new Date(publicadoEm);
				if (!Number.isNaN(date.getTime())) {
					data.publicadoEm = date;
				}
			}

			const updated = await prisma.endoPost.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza post de endomarketing",
	},
	{
		path: "/api/endo/posts/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.endoPost.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			await prisma.endoPost.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove post de endomarketing",
	},
];

export default endoPostEndpoints;
