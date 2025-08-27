// api/teams.endpoints.ts

import { CustomEndpointDefinition } from "@voltagent/core";
import { prisma } from "../utils/prisma";


export const teamEndpoints: CustomEndpointDefinition[] = [
  {
    path: '/api/teams',
    method: 'get' as const,
    handler: async (c: any) => {
      const rows = await prisma.team.findMany({
        include: {
          membros: { orderBy: { pos: 'asc' }, select: { agentId: true, pos: true } },
          regras: true,
        },
      });
      const data = rows.map((t) => ({
        id: t.id,
        nome: t.nome,
        ativo: t.ativo,
        membros: t.membros.map((m: { agentId: string }) => m.agentId),
        prioridade: t.membros
          .sort((a: { pos: number }, b: { pos: number }) => a.pos - b.pos)
          .map((m: { agentId: string }) => m.agentId),
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
    description: '[privada] lista times',
  },
];
