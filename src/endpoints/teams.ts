// api/teams.endpoints.ts

import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getTeamsByTenant } from "../repositories/team-repository";

export const teamEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/teams",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const tenantId = c.req.query("tenantId");
			if (!tenantId) {
				return c.json({ message: "tenantId is required" }, 400);
			}
			const rows = await getTeamsByTenant(tenantId);
			const data = rows.map((t) => ({
				id: t.id,
				tenantId: t.tenantId,
				nome: t.nome,
				name: t.name,
				ativo: t.ativo,
				color: t.color,
				membros: t.membros.map((m) => m.agentId),
				prioridade: [...t.membros]
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
