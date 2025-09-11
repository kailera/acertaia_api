import type { MaterialType, Prisma } from "@prisma/client";
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

export const endoMaterialEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/endo/materials",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const type = c.req.query("type");
			const categoriesParam = c.req.query("categories");
			const publishedFrom = c.req.query("publishedFrom");
			const publishedTo = c.req.query("publishedTo");
			const q = c.req.query("q");

			const where: Prisma.EndoMaterialWhereInput = {
				tenantId: auth.tenantId,
			};

			if (type) where.type = type as MaterialType;

			if (categoriesParam) {
				const cats = categoriesParam
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				if (cats.length) where.categories = { hasSome: cats };
			}

			if (publishedFrom || publishedTo) {
				where.publishedAt = {};
				if (publishedFrom) {
					const date = new Date(publishedFrom);
					if (!Number.isNaN(date.getTime())) where.publishedAt.gte = date;
				}
				if (publishedTo) {
					const date = new Date(publishedTo);
					if (!Number.isNaN(date.getTime())) where.publishedAt.lte = date;
				}
			}

			if (q) {
				where.OR = [
					{ title: { contains: q, mode: "insensitive" } },
					{ description: { contains: q, mode: "insensitive" } },
				];
			}

			const materials = await prisma.endoMaterial.findMany({
				where,
				orderBy: { publishedAt: "desc" },
			});
			return c.json(materials);
		},
		description: "[privada] lista materiais de endomarketing",
	},
	{
		path: "/api/endo/materials",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { title, description, type, url, categories, publishedAt } =
				body as {
					title?: string;
					description?: string;
					type?: string;
					url?: string;
					categories?: string[];
					publishedAt?: string;
				};
			if (!title || !type) {
				return c.json({ message: "title and type are required" }, 400);
			}

			const data: Prisma.EndoMaterialUncheckedCreateInput = {
				tenantId: auth.tenantId,
				title,
				description: description ?? null,
				type: type as MaterialType,
				url: url ?? null,
				categories: categories ?? [],
				publishedAt: publishedAt ? new Date(publishedAt) : undefined,
			};

			const created = await prisma.endoMaterial.create({ data });
			return c.json(created, 201);
		},
		description: "[privada] cria material de endomarketing",
	},
	{
		path: "/api/endo/materials/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const material = await prisma.endoMaterial.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!material) return c.json({ message: "not found" }, 404);
			return c.json(material);
		},
		description: "[privada] obtém material de endomarketing",
	},
	{
		path: "/api/endo/materials/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.endoMaterial.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { title, description, type, url, categories, publishedAt } =
				body as {
					title?: string;
					description?: string;
					type?: string;
					url?: string;
					categories?: string[];
					publishedAt?: string;
				};

			const data: Prisma.EndoMaterialUncheckedUpdateInput = {};
			if (title !== undefined) data.title = title;
			if (description !== undefined) data.description = description;
			if (type !== undefined) data.type = type as MaterialType;
			if (url !== undefined) data.url = url;
			if (categories !== undefined) data.categories = { set: categories };
			if (publishedAt !== undefined) {
				const date = new Date(publishedAt);
				if (!Number.isNaN(date.getTime())) {
					data.publishedAt = date;
				}
			}

			const updated = await prisma.endoMaterial.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza material de endomarketing",
	},
	{
		path: "/api/endo/materials/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;

			const id = c.req.param("id");
			const existing = await prisma.endoMaterial.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			await prisma.endoMaterial.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove material de endomarketing",
	},
];

export default endoMaterialEndpoints;
