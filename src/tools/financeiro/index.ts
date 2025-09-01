import { createTool } from "@voltagent/core";
import { z } from "zod";
import { prisma } from "../../utils/prisma";

const chargeParams = z
	.object({
		planId: z.string().optional(),
		studentRef: z.string().optional(),
		amount: z.number().describe("valor da cobrança"),
		method: z.enum(["PIX", "BOLETO"]).describe("método de pagamento"),
		dueDate: z.string().optional().describe("data de vencimento"),
		description: z.string().optional().describe("descrição da cobrança"),
	})
	.refine((data) => data.planId || data.studentRef, {
		message: "planId ou studentRef são obrigatórios",
	});

export const financeiroEmitCharge = createTool({
	name: "financeiro_emit_charge",
	description: "emite uma cobrança para um plano ou estudante",
	parameters: chargeParams,
	execute: async ({
		planId,
		studentRef,
		amount,
		method,
		dueDate,
		description,
	}) => {
		// Inserir cobrança no Postgres (tabela payments), vinculada a um plano
		const resolvedDue = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		let resolvedPlanId: string | null = planId ?? null;

		if (!resolvedPlanId && studentRef) {
			// Tentar resolver pelo sponsor diretamente
			const bySponsor = await prisma.plans.findFirst({ where: { sponsorId: studentRef } });
			if (bySponsor) {
				resolvedPlanId = bySponsor.id;
			} else {
				// Tentar resolver via relação Responsible usando studentId
				const rel = await prisma.responsible.findFirst({ where: { studentId: studentRef } });
				if (rel) {
					const byRel = await prisma.plans.findFirst({ where: { sponsorId: rel.sponsorId } });
					if (byRel) resolvedPlanId = byRel.id;
				}
			}
		}

		if (!resolvedPlanId) {
			return { ok: false as const, error: "Plano não encontrado para a referência informada" };
		}

		const created = await prisma.payment.create({
			data: {
				amount,
				status: "PENDING",
				method, // "PIX" | "BOLETO"
				dueDate: resolvedDue,
				notes: description ?? null,
				planId: resolvedPlanId,
			},
		});

		return {
			ok: true as const,
			paymentId: created.id,
			reference: created.id,
			status: "aguardando" as const,
		};
	},
});

const referenceParams = z
	.object({
		paymentId: z.string().optional(),
		reference: z.string().optional(),
	})
	.refine((data) => data.paymentId || data.reference, {
		message: "paymentId ou reference são obrigatórios",
	});

export const financeiroConfirmPayment = createTool({
	name: "financeiro_confirm_payment",
	description: "confirma o pagamento de uma cobrança",
	parameters: referenceParams,
	execute: async ({ paymentId, reference }) => {
		// TODO: atualizar pagamento no Postgres
		return { ok: true, status: "pago" as const };
	},
});

export const financeiroGetPaymentStatus = createTool({
	name: "financeiro_get_payment_status",
	description: "obtém o status de um pagamento",
	parameters: referenceParams,
	execute: async ({ paymentId, reference }) => {
		// TODO: consultar pagamento no Postgres
		return {
			ok: true,
			status: "aguardando",
			amount: 0,
			method: "PIX" as const,
		};
	},
});
