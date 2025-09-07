import type { Prisma } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
// api/documents.endpoints.ts
import type { Context } from "hono";
import {
	DocumentCreatePayload,
	DocumentUpdatePayload,
	kindFromLabel,
	kindToLabel,
} from "../utils/documents.helpers";
import { prisma } from "../utils/prisma";

export const documentEndpoints: CustomEndpointDefinition[] = [
	// LIST
	{
		path: "/api/documents",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const kindLabel = c.req.query("kind"); // ?kind=script|csv|media|rule|other
			const where: Prisma.DocumentWhereInput = { ownerId: userId };
			if (kindLabel) where.kind = kindFromLabel(String(kindLabel));

			const rows = await prisma.document.findMany({
				where,
				orderBy: { createdAt: "desc" },
			});

			const data = rows.map((d) => ({
				id: d.id,
				name: d.name,
				kind: kindToLabel(d.kind),
				mimeType: d.mimeType ?? undefined,
				url: d.url ?? undefined,
				body: d.body ?? undefined,
				tags: (d.tags as unknown) ?? [],
				status: d.status ?? undefined,
				perm: d.perm ?? undefined,
				meta: (d.meta as unknown) ?? undefined,
				createdAt: d.createdAt,
			}));

			return c.json(data);
		},
		description: "[privada] lista documentos do usuário (filtrável por kind)",
	},

	// LIST AGENTS LINKED TO A DOCUMENT (efficient reverse lookup)
	{
		path: "/api/documents/:id/agents",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			// Ensure the document belongs to the user
			const doc = await prisma.document.findFirst({ where: { id, ownerId: userId } });
			if (!doc) return c.json({ success: false, message: "not found" }, 404);

			const links = await prisma.agentDocument.findMany({
				where: { documentId: id },
				include: { agent: { select: { id: true, nome: true, tipo: true, status: true, isTemplate: true } } },
				orderBy: { createdAt: "desc" },
			});

			const data = links.map((l) => ({
				agent: {
					id: l.agent.id,
					nome: l.agent.nome,
					tipo: l.agent.tipo,
					status: l.agent.status,
					isTemplate: l.agent.isTemplate,
				},
				role: l.role ?? undefined,
				linkId: l.id,
				assignedAt: l.assignedAt,
			}));

			return c.json({ success: true, data });
		},
		description: "[privada] lista agentes vinculados a um documento",
	},

	// CREATE
	{
		path: "/api/documents",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const body = await c.req.json();
			const parsed = DocumentCreatePayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);
			const p = parsed.data;

			const created = await prisma.document.create({
				data: {
					ownerId: userId,
					name: p.name,
					kind: kindFromLabel(p.kind),
					mimeType: p.mimeType,
					url: p.url,
					body: p.body,
					tags: p.tags as Prisma.InputJsonValue,
					status: p.status,
					perm: p.perm,
					meta: p.meta as Prisma.InputJsonValue,
				},
			});

			return c.json({ success: true, data: { id: created.id } }, 201);
		},
		description: "[privada] cria documento (script/csv/media/rule)",
	},

	// GET BY ID
	{
		path: "/api/documents/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const d = await prisma.document.findFirst({
				where: { id, ownerId: userId },
			});
			if (!d) return c.json({ success: false, message: "not found" }, 404);

			return c.json({
				id: d.id,
				name: d.name,
				kind: kindToLabel(d.kind),
				mimeType: d.mimeType ?? undefined,
				url: d.url ?? undefined,
				body: d.body ?? undefined,
				tags: (d.tags as unknown) ?? [],
				status: d.status ?? undefined,
				perm: d.perm ?? undefined,
				meta: (d.meta as unknown) ?? undefined,
				createdAt: d.createdAt,
			});
		},
		description: "[privada] obtém documento",
	},

	// UPDATE
	{
		path: "/api/documents/:id",
		method: "put" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			const body = await c.req.json();
			const parsed = DocumentUpdatePayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);
			const p = parsed.data;

			const exists = await prisma.document.findFirst({
				where: { id, ownerId: userId },
			});
			if (!exists) return c.json({ success: false, message: "not found" }, 404);

			const updated = await prisma.document.update({
				where: { id },
				data: {
					...(p.name ? { name: p.name } : {}),
					...(p.kind ? { kind: kindFromLabel(p.kind) } : {}),
					...(p.mimeType ? { mimeType: p.mimeType } : {}),
					...(p.url ? { url: p.url } : {}),
					...(p.body !== undefined ? { body: p.body } : {}),
					...(p.tags ? { tags: p.tags as Prisma.InputJsonValue } : {}),
					...(p.status ? { status: p.status } : {}),
					...(p.perm ? { perm: p.perm } : {}),
					...(p.meta ? { meta: p.meta as Prisma.InputJsonValue } : {}),
				},
			});

			return c.json({ success: true, data: { id: updated.id } });
		},
		description: "[privada] atualiza documento",
	},

	// DELETE
	{
		path: "/api/documents/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			// segurança: só do owner
			const exists = await prisma.document.findFirst({
				where: { id, ownerId: userId },
			});
			if (!exists) return c.json({ success: false, message: "not found" }, 404);

			await prisma.agentDocument.deleteMany({ where: { documentId: id } }); // desliga vínculos
			await prisma.document.delete({ where: { id } });

			return c.json({ success: true });
		},
		description: "[privada] apaga documento (remove vínculos antes)",
	},
];
