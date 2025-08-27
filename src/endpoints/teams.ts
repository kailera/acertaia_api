// api/teams.endpoints.ts

import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { prisma } from "../utils/prisma";

export const teamEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/teams",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const rows = await prisma.team.findMany({
				include: {
					membros: {
						orderBy: { pos: "asc" },
						select: { agentId: true, pos: true },
					},
					regras: true,
				},
			});
			const data = rows.map((t) => ({
				id: t.id,
				nome: t.nome,
				ativo: t.ativo,
				membros: t.membros.map((m) => m.agentId),
				prioridade: t.membros
					.sort((a, b) => a.pos - b.pos)
					.map((m) => m.agentId),
				regras: t.regras.map((r) => ({
					id: r.id,
					de: r.deId,
					para: r.paraId,
					tipo: r.tipo,
					condicao: r.condicao,
					ordem: r.ordem,
				})),
			}));
			return c.json(data);
		},
		description: "[privada] lista times",
	},
];
