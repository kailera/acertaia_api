import { createTool } from "@voltagent/core";
import { z } from "zod";

// matricula - Cadastrar matricula quando reunir todos os dados para isso
export const registrationStudentsTool = createTool({
	name: "matricula",
	description:
		"realiza a matricula e rematricula de alunos usando os documentos fornecidos",
	parameters: z.object({
		name: z.string().describe("first name"),
		lastName: z.string().describe("last name"),
		rg: z.string().describe("rg"),
	}),
	execute: async (args) => {
		try {
			// acione o banco de dados e insira os dados corretos
			const result = `cadastro no banco: ${args.name}, ${args.lastName}, ${args.rg}`;
			return { result };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`Invalid expression: ${message} `);
		}
	},
});
