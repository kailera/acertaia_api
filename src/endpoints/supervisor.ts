// api/supervisor.endpoints.ts

import { CustomEndpointDefinition } from "@voltagent/core";
import { prisma } from "../utils/prisma";

export const supervisorEndpoints: CustomEndpointDefinition[] = [
  {
    path: '/api/supervisor',
    method: 'get' as const,
    handler: async (c: any) => {
      const s = await prisma.supervisorConfig.findUnique({ where: { id: 1 } });
      return c.json({
        id: String(s?.id ?? 1),
        nome: s?.nome ?? 'Supervisor',
        status: s?.online ? 'online' : 'offline',
        instrucoes: s?.instrucoes ?? '',
        // opcional: pode enviar também papel/playbook e o front usa direto
        papel: 'Supervisor Geral',
        playbook: {
          slaMin: s?.slaMin ?? 5,
          fallbackAtivo: s?.fallbackAtivo ?? true,
          horarios: (s?.horariosJson as any) ?? { dias: [], janelas: [] },
        },
      });
    },
    description: '[pública] dados do supervisor',
  },
  {
    path: '/api/supervisor',
    method: 'put' as const,
    handler: async (c: any) => {
      const body = await c.req.json();
      const { instrucoes, playbook } = body;
      await prisma.supervisorConfig.upsert({
        where: { id: 1 },
        update: {
          instrucoes,
          slaMin: playbook?.slaMin,
          fallbackAtivo: playbook?.fallbackAtivo,
          horariosJson: playbook?.horarios,
        },
        create: { id: 1, nome: 'Supervisor', online: false, instrucoes },
      });
      return c.json({ ok: true });
    },
    description: '[privada] atualiza supervisor',
  },
];
