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
		const resolvedDue = dueDate
			? new Date(dueDate)
			: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
		let resolvedPlanId: string | null = planId ?? null;

		if (!resolvedPlanId && studentRef) {
			// Tentar resolver pelo sponsor diretamente
			const bySponsor = await prisma.plans.findFirst({
				where: { sponsorId: studentRef },
			});
			if (bySponsor) {
				resolvedPlanId = bySponsor.id;
			} else {
				// Tentar resolver via relação Responsible usando studentId
				const rel = await prisma.responsible.findFirst({
					where: { studentId: studentRef },
				});
				if (rel) {
					const byRel = await prisma.plans.findFirst({
						where: { sponsorId: rel.sponsorId },
					});
					if (byRel) resolvedPlanId = byRel.id;
				}
			}
		}

		if (!resolvedPlanId) {
			return {
				ok: false as const,
				error: "Plano não encontrado para a referência informada",
			};
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

// -----------------------------------------------------------------------------
// Cálculo de mensalidades e matrícula

const alunoSchema = z.object({
	nome: z.string().describe("nome do aluno"),
	valorBase: z.number().describe("mensalidade base"),
	pctPontualidade: z.number().describe("% de desconto de pontualidade"),
	aplicaIrmaosAposPontualidade: z
		.boolean()
		.describe("se o desconto de irmãos incide após pontualidade"),
});

const regraIrmaosSchema = z.object({
	tipo: z.enum(["A", "B", "C"]).describe("tipo de regra"),
	percentuais: z.array(z.number()).optional().describe("percentuais por aluno"),
	percentualFamilia: z
		.number()
		.optional()
		.describe("percentual único sobre o total"),
	valorFixo: z.number().optional().describe("valor fixo por irmão adicional"),
});

export const financeiroCalcularMensalidades = createTool({
	name: "financeiro_calcular_mensalidades",
	description: "calcula valores por aluno e família com descontos",
	parameters: z.object({
		alunos: z.array(alunoSchema),
		regraIrmaos: regraIrmaosSchema.optional(),
	}),
	execute: async ({ alunos, regraIrmaos }) => {
		const detalhes = alunos.map((a) => {
			const descontoPont = a.valorBase * a.pctPontualidade;
			const baseIrmaos = a.aplicaIrmaosAposPontualidade
				? a.valorBase - descontoPont
				: a.valorBase;
			return {
				nome: a.nome,
				valorBase: a.valorBase,
				descontoPontualidade: descontoPont,
				baseIrmaos,
			};
		});

		const somaBases = detalhes.reduce((s, a) => s + a.valorBase, 0);
		const descontoPontTotal = detalhes.reduce(
			(s, a) => s + a.descontoPontualidade,
			0,
		);

		const somaBaseIrmaos = detalhes.reduce((s, a) => s + a.baseIrmaos, 0);

		const descontosIrmaos = new Array(detalhes.length).fill(0);
		let descontoIrmaosTotal = 0;

		if (regraIrmaos) {
			if (regraIrmaos.tipo === "A") {
				const ordenados = detalhes
					.map((a, i) => ({ ...a, index: i }))
					.sort((a, b) => a.baseIrmaos - b.baseIrmaos);
				for (let i = 1; i < ordenados.length; i++) {
					const pct =
						regraIrmaos.percentuais?.[i - 1] ??
						regraIrmaos.percentuais?.[regraIrmaos.percentuais.length - 1] ??
						0;
					const desc = ordenados[i].baseIrmaos * pct;
					descontosIrmaos[ordenados[i].index] = desc;
					descontoIrmaosTotal += desc;
				}
			} else if (regraIrmaos.tipo === "B") {
				const pct = regraIrmaos.percentualFamilia ?? 0;
				descontoIrmaosTotal = somaBaseIrmaos * pct;
				detalhes.forEach((a, idx) => {
					descontosIrmaos[idx] =
						descontoIrmaosTotal * (a.baseIrmaos / somaBaseIrmaos);
				});
			} else if (regraIrmaos.tipo === "C") {
				const valor = regraIrmaos.valorFixo ?? 0;
				descontoIrmaosTotal = valor * Math.max(detalhes.length - 1, 0);
				detalhes.forEach((a, idx) => {
					descontosIrmaos[idx] =
						descontoIrmaosTotal * (a.baseIrmaos / somaBaseIrmaos);
				});
			}
		}

		const alunosOut = detalhes.map((a, idx) => ({
			nome: a.nome,
			valorBase: a.valorBase,
			descontoPontualidade: a.descontoPontualidade,
			descontoIrmaos: descontosIrmaos[idx],
			totalAluno: a.valorBase - a.descontoPontualidade - descontosIrmaos[idx],
		}));

		const totalFamilia = somaBases - descontoPontTotal - descontoIrmaosTotal;

		return {
			alunos: alunosOut,
			resumoFamilia: {
				somaBases,
				descontoPontualidadeTotal: descontoPontTotal,
				descontoIrmaosTotal,
				totalFamilia,
			},
		};
	},
});

// -----------------------------------------------------------------------------
// Ferramentas adicionais do financeiro

export const financeiroListAdditionalFees = createTool({
	name: "financeiro_list_taxas_adicionais",
	description: "lista taxas adicionais como matrícula e material didático",
	parameters: z.object({}),
	execute: async () => {
		return {
			ok: true as const,
			fees: [
				{ tipo: "matrícula", valor: 100 },
				{ tipo: "rematrícula", valor: 80 },
				{ tipo: "atividades_extracurriculares", valor: 50 },
				{ tipo: "excursões", valor: 200 },
				{ tipo: "material_didático", valor: 150 },
			],
		};
	},
});

export const financeiroListBoletos = createTool({
	name: "financeiro_list_boletos",
	description: "lista boletos emitidos com status",
	parameters: z.object({}),
	execute: async () => {
		return {
			boletos: [
				{
					linhaDigitavel:
						"00000.00000 00000.000000 00000.000000 0 00000000000000",
					dueDate: new Date().toISOString(),
					status: "ABERTO" as const,
				},
				{
					linhaDigitavel:
						"11111.11111 11111.111111 11111.111111 1 11111111111111",
					dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
					status: "PAGO" as const,
				},
				{
					linhaDigitavel:
						"22222.22222 22222.222222 22222.222222 2 22222222222222",
					dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
					status: "ATRASADO" as const,
				},
			],
		};
	},
});

export const financeiroGetPaymentHistory = createTool({
	name: "financeiro_get_payment_history",
	description: "obtém histórico de pagamentos",
	parameters: z.object({ planId: z.string().optional() }),
	execute: async ({ planId }) => {
		const where = planId ? { planId } : {};
		const payments = await prisma.payment.findMany({
			where,
			orderBy: { dueDate: "desc" },
		});
		return {
			historico: payments.map((p) => ({
				data: (p.paidAt ?? p.dueDate).toISOString(),
				valor: p.amount,
				metodo: p.method,
			})),
		};
	},
});

export const financeiroGetScholarshipInfo = createTool({
	name: "financeiro_get_scholarship_info",
	description: "informa critérios e descontos de bolsas de estudo",
	parameters: z.object({}),
	execute: async () => {
		return {
			criterios: ["renda familiar", "mérito acadêmico"],
			concursos: ["Concurso Interno", "Olimpíadas"],
			descontos: [0.5, 0.3],
		};
	},
});

export const financeiroListConvenios = createTool({
	name: "financeiro_list_convenios",
	description: "lista convênios com empresas parceiras",
	parameters: z.object({}),
	execute: async () => {
		return {
			convenios: [
				{ empresa: "Empresa A", desconto: 0.1 },
				{ empresa: "Empresa B", desconto: 0.15 },
			],
		};
	},
});

const negotiationParams = z.object({
	planId: z.string().describe("plano relacionado"),
	detalhes: z.string().describe("detalhes do acordo"),
	parcelas: z.number().optional().describe("quantidade de parcelas"),
});

export const financeiroRegisterNegotiation = createTool({
	name: "financeiro_registrar_negociacao",
	description: "registra negociações ou parcelamentos de um plano",
	parameters: negotiationParams,
	execute: async ({ planId, detalhes, parcelas }) => {
		await prisma.plans.update({
			where: { id: planId },
			data: {
				negotiation: `${detalhes}${parcelas ? ` | parcelas: ${parcelas}` : ""}`,
			},
		});
		return { ok: true as const };
	},
});
