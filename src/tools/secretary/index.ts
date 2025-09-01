import { createTool } from "@voltagent/core";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { randomUUID } from "crypto";

export const secretariaUpsertEnrollment = createTool({
	name: "secretaria_upsert_enrollment",
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
		// Persistir no Postgres (upsert de aluno e matrícula)
		const now = new Date();
		const finalStatus = status ?? "pendente";

		// 1) Garantir tabelas mínimas (DDL idempotente)
		await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS secretaria_student (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			cpf TEXT,
			email TEXT,
			phone TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`;
		await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS secretaria_student_cpf_uq ON secretaria_student((lower(cpf))) WHERE cpf IS NOT NULL`;
		await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS secretaria_student_email_uq ON secretaria_student((lower(email))) WHERE email IS NOT NULL`;

		await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS secretaria_enrollment (
			id TEXT PRIMARY KEY,
			student_id TEXT NOT NULL REFERENCES secretaria_student(id) ON DELETE CASCADE,
			course TEXT NOT NULL,
			status TEXT NOT NULL,
			notes TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			UNIQUE(student_id, course)
		)`;

		// 2) Upsert do aluno (prioridade por cpf > email > phone)
		let studentId: string | null = null;
		if (student.cpf) {
			const rows = (await prisma.$queryRaw<{ id: string }[]>`
				SELECT id FROM secretaria_student WHERE lower(cpf) = lower(${student.cpf}) LIMIT 1
			`);
			studentId = rows[0]?.id ?? null;
		}
		if (!studentId && student.email) {
			const rows = (await prisma.$queryRaw<{ id: string }[]>`
				SELECT id FROM secretaria_student WHERE lower(email) = lower(${student.email}) LIMIT 1
			`);
			studentId = rows[0]?.id ?? null;
		}
		if (!studentId && student.phone) {
			const rows = (await prisma.$queryRaw<{ id: string }[]>`
				SELECT id FROM secretaria_student WHERE phone = ${student.phone} LIMIT 1
			`);
			studentId = rows[0]?.id ?? null;
		}

		if (!studentId) {
			const newId = randomUUID();
			await prisma.$executeRaw`
				INSERT INTO secretaria_student (id, name, cpf, email, phone, created_at, updated_at)
				VALUES (${newId}, ${student.name}, ${student.cpf ?? null}, ${student.email ?? null}, ${student.phone ?? null}, ${now}, ${now})
			`;
			studentId = newId;
		} else {
			await prisma.$executeRaw`
				UPDATE secretaria_student
				SET name = ${student.name},
					cpf = COALESCE(${student.cpf ?? null}, cpf),
					email = COALESCE(${student.email ?? null}, email),
					phone = COALESCE(${student.phone ?? null}, phone),
					updated_at = ${now}
				WHERE id = ${studentId}
			`;
		}

		// 3) Upsert da matrícula
		let enrollmentId: string | null = null;
		const enr = (await prisma.$queryRaw<{ id: string; status: string }[]>`
			SELECT id, status FROM secretaria_enrollment WHERE student_id = ${studentId} AND course = ${course} LIMIT 1
		`)[0];

		if (!enr) {
			const newId = randomUUID();
			await prisma.$executeRaw`
				INSERT INTO secretaria_enrollment (id, student_id, course, status, notes, created_at, updated_at)
				VALUES (${newId}, ${studentId}, ${course}, ${finalStatus}, ${notes ?? null}, ${now}, ${now})
			`;
			enrollmentId = newId;
		} else {
			enrollmentId = enr.id;
			await prisma.$executeRaw`
				UPDATE secretaria_enrollment
				SET status = ${finalStatus},
					notes = ${notes ?? null},
					updated_at = ${now}
				WHERE id = ${enrollmentId}
			`;
		}

		return {
			ok: true,
			studentId: studentId!,
			enrollmentId: enrollmentId!,
			status: finalStatus,
		};
	},
});

export const secretariaGetEnrollmentStatus = createTool({
	name: "secretaria_get_enrollment_status",
	description: "obtém o status da matrícula de um aluno por CPF ou email",
	parameters: z.object({
		cpfOrEmail: z.string().describe("CPF ou email do aluno"),
		course: z.string().describe("curso da matrícula"),
	}),
	execute: async ({ cpfOrEmail, course }) => {
		// Consultar Postgres: localizar aluno por CPF ou email e retornar status da matrícula no curso
		const key = cpfOrEmail.trim();
		const isEmail = key.includes("@");

		let studentId: string | null = null;
		if (isEmail) {
			const rows = (await prisma.$queryRaw<{ id: string }[]>`
				SELECT id FROM secretaria_student WHERE lower(email) = lower(${key}) LIMIT 1
			`);
			studentId = rows[0]?.id ?? null;
		} else {
			const rows = (await prisma.$queryRaw<{ id: string }[]>`
				SELECT id FROM secretaria_student WHERE lower(cpf) = lower(${key}) LIMIT 1
			`);
			studentId = rows[0]?.id ?? null;
		}

		if (!studentId) return { ok: true, status: "nao_encontrado" } as const;

		const enr = (await prisma.$queryRaw<{ id: string; status: string }[]>`
			SELECT id, status FROM secretaria_enrollment WHERE student_id = ${studentId} AND course = ${course} LIMIT 1
		`)[0];

		if (!enr) return { ok: true, status: "nao_encontrado" } as const;

		return { ok: true, status: enr.status } as const;
	},
});

export const secretariaListRequirements = createTool({
	name: "secretaria_list_requirements",
	description: "lista os requisitos para um curso",
	parameters: z.object({
		course: z.string().describe("curso para consulta"),
	}),
	execute: async ({ course }) => {
		// Buscar regras internas no Postgres (tabela própria de requisitos)
		await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS secretaria_course_requirements (
			id TEXT PRIMARY KEY,
			course TEXT NOT NULL,
			requirement TEXT NOT NULL,
			required BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			UNIQUE(course, requirement)
		)`;

		const rows = await prisma.$queryRaw<{ requirement: string; required: boolean }[]>`
			SELECT requirement, required FROM secretaria_course_requirements WHERE course = ${course} ORDER BY requirement
		`;

		return { course, requirements: rows.map((r) => ({ text: r.requirement, required: r.required })) };
	},
});
