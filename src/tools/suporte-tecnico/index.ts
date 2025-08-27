import { createTool } from "@voltagent/core";
import { z } from "zod";

export const suporteTecnicoTool = createTool({
	name: "diagnosticarProblema",
	description: "Ferramenta de exemplo para suporte técnico",
	parameters: z.object({
		issue: z.string().describe("descrição do problema"),
	}),
	execute: async ({ issue }) => {
		return { result: `Problema '${issue}' registrado` };
	},
});
