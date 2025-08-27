import { createTool } from "@voltagent/core";
import { z } from "zod";

export const financeiroTool = createTool({
	name: "emitirRelatorio",
	description: "Emite um relatório financeiro de exemplo",
	parameters: z.object({
		mes: z.string().describe("mês de referência"),
	}),
	execute: async ({ mes }) => {
		return { result: `Relatório financeiro de ${mes} gerado` };
	},
});
