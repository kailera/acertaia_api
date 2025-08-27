import type { CustomEndpointDefinition } from "@voltagent/core";
// api/agent-docs.endpoints.ts
import type { Context } from "hono";
import {
	LinkPayload,
	assertSameOwner,
	roleFromLabel,
	roleToLabel,
} from "../utils/documents.helpers";
import { prisma } from "../utils/prisma";

export const agentDocumentEndpoints: CustomEndpointDefinition[] = [
	// LISTAR documentos vinculados a um agente
	{
		path: "/api/agents/:agentId/documents",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const agentId = c.req.param("agentId");

			// garante que o agente é do usuário
			const agent = await prisma.agent.findFirst({
				where: { id: agentId, ownerId: userId },
			});
			if (!agent) return c.json({ success: false, message: "not found" }, 404);

			const links = await prisma.agentDocument.findMany({
				where: { agentId },
				include: { document: true },
				orderBy: { createdAt: "desc" },
			});

			const data = links.map((l) => ({
				document: {
					id: l.document.id,
					name: l.document.name,
					kind: l.document.kind, // pode mapear para label se preferir
				},
				role: l.role ? roleToLabel(l.role) : roleToLabel("EXTRA"),
				linkId: l.id,
			}));

			return c.json(data);
		},
		description: "[privada] lista vínculos documento↔agente",
	},

	// CRIAR vínculo
	{
		path: "/api/agents/:agentId/documents",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const agentId = c.req.param("agentId");
			const body = await c.req.json();
			const parsed = LinkPayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);
			const p = parsed.data;

			// garante ownership de ambos
			try {
				await assertSameOwner(userId, agentId, p.documentId);
			} catch (e: unknown) {
				const msg =
					e instanceof Error && e.message === "forbidden"
						? "forbidden"
						: "not found";
				return c.json(
					{ success: false, message: msg },
					msg === "forbidden" ? 403 : 404,
				);
			}

			// define role padrão pelo kind do documento, caso não venha do front
			let roleEnum = p.role ? roleFromLabel(p.role) : undefined;
			if (!roleEnum) {
				const doc = await prisma.document.findUnique({
					where: { id: p.documentId },
				});
				roleEnum =
					doc?.kind === "SCRIPT"
						? "EXTRA"
						: doc?.kind === "CSV"
							? "CSV"
							: doc?.kind === "MEDIA"
								? "MEDIA"
								: "EXTRA";
			}

			// evita duplicado (unique composto no schema)
			const created = await prisma.agentDocument.create({
				data: {
					agentId,
					documentId: p.documentId,
					role: roleEnum,
				},
			});

			return c.json({ success: true, data: { linkId: created.id } }, 201);
		},
		description: "[privada] vincula documento a agente",
	},

	// REMOVER vínculo
	{
		path: "/api/agents/:agentId/documents/:documentId",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const agentId = c.req.param("agentId");
			const documentId = c.req.param("documentId");
			const role = c.req.query("role"); // ?role=primary|extra|csv|media|rule_override (opcional)

			// ownership
			try {
				await assertSameOwner(userId, agentId, documentId);
			} catch (e: unknown) {
				const msg =
					e instanceof Error && e.message === "forbidden"
						? "forbidden"
						: "not found";
				return c.json(
					{ success: false, message: msg },
					msg === "forbidden" ? 403 : 404,
				);
			}

			if (role) {
				// quando tem unique([agentId, documentId, role])
				await prisma.agentDocument.deleteMany({
					where: { agentId, documentId, role: roleFromLabel(String(role)) },
				});
			} else {
				await prisma.agentDocument.deleteMany({
					where: { agentId, documentId },
				});
			}

			return c.json({ success: true });
		},
		description:
			"[privada] desvincula documento de agente (por role, se enviado)",
	},
];
