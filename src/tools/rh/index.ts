import { createTool } from "@voltagent/core";
import { z } from "zod";

export const rhTool = createTool({
	name: "registrarFuncionario",
	description: "Registra um funcionário de exemplo",
	parameters: z.object({
		nome: z.string().describe("nome do funcionário"),
	}),
	execute: async ({ nome }) => {
		return { result: `Funcionário ${nome} registrado` };
	},
});
