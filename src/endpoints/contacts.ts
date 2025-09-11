import type { Prisma } from "@prisma/client";
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

function parseTags(param: string | undefined): string[] | undefined {
	if (!param) return undefined;
	return param
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
}

export const contactEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/contacts",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const q = c.req.query("q") || undefined;
			const tags = parseTags(c.req.query("tags"));
			const createdFrom = c.req.query("createdFrom");
			const createdTo = c.req.query("createdTo");

			const where: Prisma.ContactsWhereInput = {
				user: { tenantId: auth.tenantId },
			} as unknown as Prisma.ContactsWhereInput;

			if (q) {
				where.OR = [
					{ name: { contains: q, mode: "insensitive" } },
					{ number: { contains: q } },
				];
			}
			if (tags && tags.length > 0) {
				(
					where as unknown as {
						tags: { hasEvery: string[] };
					}
				).tags = { hasEvery: tags };
			}
			if (createdFrom || createdTo) {
				where.createdAt = {};
				if (createdFrom) where.createdAt.gte = new Date(createdFrom);
				if (createdTo) where.createdAt.lte = new Date(createdTo);
			}

			const contacts = await prisma.contacts.findMany({ where });
			return c.json(contacts);
		},
		description: "[privada] lista contatos",
	},
	{
		path: "/api/contacts",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { name, phone, tags } = body as {
				name?: string;
				phone?: string;
				tags?: string[];
			};
			if (!name || !phone) {
				return c.json({ message: "name and phone are required" }, 400);
			}
			const existing = await prisma.contacts.findFirst({
				where: {
					number: phone,
					user: { tenantId: auth.tenantId },
				},
			});
			if (existing) {
				return c.json({ message: "phone already exists" }, 409);
			}
			const createData: Prisma.ContactsCreateInput = {
				name,
				number: phone,
				userId: auth.userId,
				...(tags ? { tags } : {}),
			} as unknown as Prisma.ContactsCreateInput;
			const created = await prisma.contacts.create({ data: createData });
			return c.json(created, 201);
		},
		description: "[privada] cria contato",
	},
	{
		path: "/api/contacts/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const contact = await prisma.contacts.findFirst({
				where: { id, user: { tenantId: auth.tenantId } },
			});
			if (!contact) return c.json({ message: "not found" }, 404);
			return c.json(contact);
		},
		description: "[privada] busca contato por id",
	},
	{
		path: "/api/contacts/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.contacts.findFirst({
				where: { id, user: { tenantId: auth.tenantId } },
				select: { number: true },
			});
			if (!existing) return c.json({ message: "not found" }, 404);

			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { name, phone, tags } = body as {
				name?: string;
				phone?: string;
				tags?: string[];
			};
			const data: Prisma.ContactsUpdateInput =
				{} as unknown as Prisma.ContactsUpdateInput;
			if (name !== undefined) data.name = name;
			if (phone !== undefined && phone !== existing.number) {
				const duplicate = await prisma.contacts.findFirst({
					where: {
						number: phone,
						user: { tenantId: auth.tenantId },
					},
				});
				if (duplicate) {
					return c.json({ message: "phone already exists" }, 409);
				}
				(data as unknown as { number: string }).number = phone;
			}
			if (tags !== undefined)
				(data as unknown as { tags: string[] | undefined }).tags = tags;
			if (Object.keys(data as object).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const updated = await prisma.contacts.update({
				where: { id },
				data,
			});
			return c.json(updated);
		},
		description: "[privada] atualiza contato",
	},
	{
		path: "/api/contacts/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.contacts.findFirst({
				where: { id, user: { tenantId: auth.tenantId } },
				select: { id: true },
			});
			if (!existing) return c.json({ message: "not found" }, 404);
			await prisma.contacts.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove contato",
	},
];
