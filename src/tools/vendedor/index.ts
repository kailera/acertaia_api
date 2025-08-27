import { createTool } from "@voltagent/core";
import { z } from "zod";

export const vendedorTool = createTool({
	name: "gerarCotacao",
	description: "Gera uma cotação de exemplo",
	parameters: z.object({
		produto: z.string().describe("nome do produto"),
	}),
	execute: async ({ produto }) => {
		return { result: `Cotação gerada para ${produto}` };
	},
});
