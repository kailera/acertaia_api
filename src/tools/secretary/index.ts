import { createTool } from "@voltagent/core";
import { z } from "zod";

export const secretariaUpsertEnrollment = createTool({
	name: "secretaria.upsert_enrollment",
	description: "cria ou atualiza uma matrícula de aluno",
	parameters: z.object({
		student: z.object({
			name: z.string().describe("nome completo"),
			cpf: z.string().optional().describe("CPF do aluno"),
			email: z.string().email().optional().describe("email do aluno"),
			phone: z.string().optional().describe("telefone do aluno"),
		}),
		course: z.string().describe("curso da matrícula"),
		status: z
			.enum(["pendente", "ativa", "cancelada"])
			.optional()
			.describe("status da matrícula"),
		notes: z.string().optional().describe("observações adicionais"),
	}),
	execute: async ({ student, course, status, notes }) => {
		// TODO: persistir no Postgres
		return {
			ok: true,
			studentId: "TODO",
			enrollmentId: "TODO",
			status: status ?? "pendente",
		};
	},
});

export const secretariaGetEnrollmentStatus = createTool({
	name: "secretaria.get_enrollment_status",
	description: "obtém o status da matrícula de um aluno por CPF ou email",
	parameters: z.object({
		cpfOrEmail: z.string().describe("CPF ou email do aluno"),
		course: z.string().describe("curso da matrícula"),
	}),
	execute: async ({ cpfOrEmail, course }) => {
		// TODO: consultar Postgres
		return { ok: true, status: "pendente" };
	},
});

export const secretariaListRequirements = createTool({
	name: "secretaria.list_requirements",
	description: "lista os requisitos para um curso",
	parameters: z.object({
		course: z.string().describe("curso para consulta"),
	}),
	execute: async ({ course }) => {
		// TODO: buscar regras internas
		return { course, requirements: [] };
	},
});
