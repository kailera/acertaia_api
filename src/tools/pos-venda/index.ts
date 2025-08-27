import { createTool } from "@voltagent/core";
import { z } from "zod";

export const posVendaTool = createTool({
	name: "followUp",
	description: "Ferramenta de exemplo para pós-venda",
	parameters: z.object({
		ticket: z.string().describe("número do ticket"),
	}),
	execute: async ({ ticket }) => {
		return { result: `Follow-up registrado para o ticket ${ticket}` };
	},
});
