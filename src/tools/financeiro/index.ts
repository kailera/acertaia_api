import { createTool } from "@voltagent/core";
import { z } from "zod";
import { prisma } from "../../utils/prisma";
import { randomUUID } from "crypto";
import { EMBED_MODEL, openaiClient } from "../../utils/openai";
import { qdrant, QDRANT_COLLECTION } from "../../vector/qdrant";

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

	// deve salvar no banco de dados e ser acessável pelo agente.
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

// deve salvar a atualização no banco de dados e ser acessável pelo agente.
export const financeiroConfirmPayment = createTool({
	name: "financeiro_confirm_payment",
	description: "confirma o pagamento de uma cobrança",
	parameters: referenceParams,
	execute: async ({ paymentId, reference }) => {
		// Atualizar pagamento no Postgres: marcar como PAID e setar paidAt
		const id = paymentId ?? reference;
		if (!id) return { ok: false as const, error: "referência inválida" };

		const exists = await prisma.payment.findUnique({ where: { id } });
		if (!exists) return { ok: false as const, error: "pagamento não encontrado" };

		if (exists.status !== "PAID") {
			await prisma.payment.update({
				where: { id },
				data: { status: "PAID", paidAt: new Date() },
			});
		}

		return { ok: true as const, status: "pago" as const };
	},
});

export const financeiroGetPaymentStatus = createTool({
	name: "financeiro_get_payment_status",
	description: "obtém o status de um pagamento",
	parameters: referenceParams,
	execute: async ({ paymentId, reference }) => {
		const id = paymentId ?? reference;
		if (!id) return { ok: false as const, error: "referência inválida" };

		const p = await prisma.payment.findUnique({ where: { id } });
		if (!p) return { ok: false as const, error: "pagamento não encontrado" };

		const status = p.status === "PAID" ? "pago" : p.status === "CANCELED" ? "cancelado" : "aguardando";
		return {
			ok: true as const,
			status,
			amount: p.amount,
			method: p.method as "PIX" | "BOLETO" | "CARTAO",
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

// Ferramenta consultiva -> consultar dados fornecidos nos documentos (via retriver) - não inventar
export const financeiroListAdditionalFees = createTool({
	name: "financeiro_list_taxas_adicionais",
	description: "lista taxas adicionais como matrícula e material didático",
	parameters: z.object({}),
		execute: async () => {
			// Consulta documentos via retriever (Qdrant) e extrai taxas por regex simples
			const query =
				"taxas adicionais matrícula rematrícula material didático atividades excursões mensalidades custos valores";
			const emb = await openaiClient.embeddings.create({
				model: EMBED_MODEL,
				input: query,
			});
			const vector = emb.data[0].embedding as number[];
			const results = (await qdrant.search(QDRANT_COLLECTION, {
				vector,
				limit: 8,
				with_payload: true,
				// Preferir RULE/CSV quando houver
				filter: {
					should: [
						{ key: "kind", match: { value: "RULE" } },
						{ key: "kind", match: { value: "CSV" } },
					],
				},
			})) as Array<{
				payload?: { text?: string; docName?: string; kind?: string };
				score?: number;
			}>;

			// Regex por taxa
			const patterns: Array<{ key: string; rx: RegExp }> = [
				{ key: "matrícula", rx: /(matr[ií]cula)[^\d]*(\d+[\.,]?\d*)/i },
				{ key: "rematrícula", rx: /(rematr[ií]cula)[^\d]*(\d+[\.,]?\d*)/i },
				{
					key: "material_didático",
					rx: /(material(\s+did[aá]tico)?)[^\d]*(\d+[\.,]?\d*)/i,
				},
				{
					key: "atividades_extracurriculares",
					rx: /(atividades?\s*extra(curriculares)?)[^\d]*(\d+[\.,]?\d*)/i,
				},
				{ key: "excursões", rx: /(excurs[õo]es?)[^\d]*(\d+[\.,]?\d*)/i },
			];

			// Mapa agregado: mantém o menor valor e a melhor referência
			const feeMap = new Map<string, { valor: number; source: string; score: number }>();
			results.forEach((r, idx) => {
				const text = r.payload?.text ?? "";
				if (!text) return;
				const lines = text.split(/\n+/);
				for (const ln of lines) {
					for (const { key, rx } of patterns) {
						const m = ln.match(rx);
						const valStr = m?.[2] ?? m?.[3];
						if (!m || !valStr) continue;
						const normalized = Number(valStr.replace(/[\.]/g, "").replace(",", "."));
						if (!Number.isFinite(normalized) || normalized <= 0) continue;

						const prev = feeMap.get(key);
						const source = r.payload?.docName || `Document ${idx + 1}`;
						const score = typeof r.score === "number" ? r.score : 0;
						if (!prev || normalized < prev.valor || (normalized === prev.valor && score > prev.score)) {
							feeMap.set(key, { valor: normalized, source, score });
						}
					}
				}
			});

			const fees = Array.from(feeMap.entries()).map(([tipo, v]) => ({ tipo, valor: v.valor, source: v.source, score: v.score }));
			return { ok: true as const, fees };
		},
});


// consultar no banco de dados
export const financeiroListBoletos = createTool({
    name: "financeiro_list_boletos",
    description: "lista boletos emitidos com status",
    parameters: z.object({
        status: z.enum(["ABERTO", "PAGO", "ATRASADO"]).optional(),
        startDate: z.string().optional().describe("início do período (ISO)"),
        endDate: z.string().optional().describe("fim do período (ISO)"),
    }),
    execute: async ({ status, startDate, endDate }) => {
        const mapUiToDb = (s: "ABERTO" | "PAGO" | "ATRASADO") =>
            s === "PAGO" ? "PAIED" : s === "ATRASADO" ? "EXPIRED" : "PENDENT";
        const mapDbToUi = (s: string) =>
            s === "PAIED" ? ("PAGO" as const) : s === "EXPIRED" ? ("ATRASADO" as const) : ("ABERTO" as const);

        const where: any = {};
        if (status) where.status = mapUiToDb(status);

        const gte = startDate ? new Date(startDate) : undefined;
        const lte = endDate ? new Date(endDate) : undefined;
        const validGte = gte && !isNaN(gte.getTime()) ? gte : undefined;
        const validLte = lte && !isNaN(lte.getTime()) ? lte : undefined;
        if (validGte || validLte) {
            where.expiredIn = { ...(validGte ? { gte: validGte } : {}), ...(validLte ? { lte: validLte } : {}) };
        }

        const rows = await prisma.boletos.findMany({ where, orderBy: { createdAt: "desc" } });
        return {
            boletos: rows.map((b) => ({
                linhaDigitavel: b.typedLine,
                dueDate: b.expiredIn.toISOString(),
                status: mapDbToUi(b.status),
            })),
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

// Ferramenta consultiva -> consultar dados fornecidos nos documentos (via retriver) - não inventar
export const financeiroListConvenios = createTool({
	name: "financeiro_list_convenios",
	description: "lista convênios com empresas parceiras",
	parameters: z.object({}),
	execute: async () => {
		// Buscar em documentos via Qdrant e extrair convênios (empresa + % desconto)
		const query = "convênio convenio parceria empresa parceira desconto % acordo corporativo";
		const emb = await openaiClient.embeddings.create({ model: EMBED_MODEL, input: query });
		const vector = emb.data[0].embedding as number[];
		const results = (await qdrant.search(QDRANT_COLLECTION, {
			vector,
			limit: 10,
			with_payload: true,
			filter: {
				should: [
					{ key: "kind", match: { value: "RULE" } },
					{ key: "kind", match: { value: "CSV" } },
				],
			},
		})) as Array<{ payload?: { text?: string; docName?: string }; score?: number }>;

		const convMap = new Map<string, number>();
		const companyRegexes = [
			/(?:empresa|companhia|parceira|parceria com|conv[eê]nio com)\s*[:\-]?\s*([A-Z][\p{L}0-9\-& ]{2,})/iu,
			/(?:conv[eê]nio)\s*[:\-]?\s*([A-Z][\p{L}0-9\-& ]{2,})/iu,
		];
		const discountRegexes = [
			/descontos?\s*(?:de)?\s*(\d+[\.,]?\d*)\s*%/iu,
			/(\d+[\.,]?\d*)\s*%\s*(?:de\s*desconto)?/iu,
		];

		for (const r of results) {
			const text = r.payload?.text ?? "";
			if (!text) continue;
			const lines = text.split(/\n+/);
			for (const ln of lines) {
				let empresa: string | undefined;
				for (const crx of companyRegexes) {
					const m = ln.match(crx);
					if (m && m[1]) {
						empresa = m[1].trim();
						break;
					}
				}
				if (!empresa) continue;

				let pct: number | undefined;
				for (const drx of discountRegexes) {
					const m = ln.match(drx);
					if (m && m[1]) {
						const n = Number(m[1].replace(/[\.]/g, "").replace(",", "."));
						if (Number.isFinite(n) && n > 0) {
							pct = n;
							break;
						}
					}
				}
				if (pct === undefined) continue;

				const frac = Math.max(0, Math.min(1, pct / 100));
				const current = convMap.get(empresa);
				convMap.set(empresa, current ? Math.max(current, frac) : frac);
			}
		}

		const convenios = Array.from(convMap.entries()).map(([empresa, desconto]) => ({ empresa, desconto }));
		return { convenios };
	},
});

const negotiationParams = z.object({
	planId: z.string().describe("plano relacionado"),
	detalhes: z.string().describe("detalhes do acordo"),
	parcelas: z.number().optional().describe("quantidade de parcelas"),
});

// registra no banco de dados
export const financeiroRegisterNegotiation = createTool({
    name: "financeiro_registrar_negociacao",
    description: "registra negociações ou parcelamentos de um plano",
    parameters: negotiationParams,
    execute: async ({ planId, detalhes, parcelas }) => {
        // 1) valida existência do plano
        const plan = await prisma.plans.findUnique({ where: { id: planId } });
        if (!plan) return { ok: false as const, error: "plano não encontrado" };

        // 2) garante tabela histórica (idempotente)
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS plan_negotiations (
            id TEXT PRIMARY KEY,
            plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
            details TEXT NOT NULL,
            parcelas INT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS plan_negotiations_plan_idx ON plan_negotiations(plan_id)`;

        // 3) insere registro histórico
        const id = randomUUID();
        await prisma.$executeRaw`
            INSERT INTO plan_negotiations (id, plan_id, details, parcelas)
            VALUES (${id}, ${planId}, ${detalhes}, ${parcelas ?? null})
        `;

        return { ok: true as const, negotiationId: id };
    },
});
