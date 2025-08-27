import { createTool } from "@voltagent/core";
import { z } from "zod";

export const logisticaTool = createTool({
  name: "agendarEntrega",
  description: "Agenda uma entrega de exemplo",
  parameters: z.object({
    pedido: z.string().describe("número do pedido"),
  }),
  execute: async ({ pedido }) => {
    return { result: `Entrega do pedido ${pedido} agendada` };
  },
});
