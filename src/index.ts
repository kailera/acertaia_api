import {
	type CustomEndpointDefinition,
	VoltAgent,
	VoltOpsClient,
	registerCustomEndpoints,
} from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import "./utils/env";

import { FinanceiroAgent } from "./agents/financeiro";
import { LogisticaAgent } from "./agents/logistica";
import { SDRAgent } from "./agents/sdr";
import { SecretaryAgent } from "./agents/secretary";

import { agentTrainEndpoints } from "./endpoints/agent-trainning";
import { agentEndpoints } from "./endpoints/agents";
import { agentDocumentEndpoints } from "./endpoints/agents-docs";
import { campaignEndpoints } from "./endpoints/campaigns";
import { chatEndpoints } from "./endpoints/chat";
import { contactEndpoints } from "./endpoints/contacts";
import { conversationEndpoints } from "./endpoints/conversations";
import { dealEndpoints } from "./endpoints/deals";
import { documentEndpoints } from "./endpoints/documents";
import { endoActionEndpoints } from "./endpoints/endo/actions";
import { endoItemEndpoints } from "./endpoints/endo/items";
import { endoMaterialEndpoints } from "./endpoints/endo/materials";
import { endoPostEndpoints } from "./endpoints/endo/posts";
import { fileEndpoints } from "./endpoints/files";
import { financeiroEndpoints } from "./endpoints/financeiro";
import { sellerKpiDailyEndpoints } from "./endpoints/kpis/sellers";
import { teamKpiDailyEndpoints } from "./endpoints/kpis/teams";
import { logisticaEndpoints } from "./endpoints/logistica";
import { srdEndpoints } from "./endpoints/sdr";
import { secretaryEndpoints } from "./endpoints/secretary";
import { slaConfigEndpoints } from "./endpoints/sla-configs";
import { supervisorEndpoints } from "./endpoints/supervisor";
import { teamEndpoints } from "./endpoints/teams";
import { tenantEndpoints } from "./endpoints/tenants";
import { uploadDirectEndpoints } from "./endpoints/upload-files";
import { userEndpoints } from "./endpoints/user";

import { PostgresStorage } from "@voltagent/postgres";
import { waEndpoints } from "./endpoints/wa";
import { whatsappEndpoints } from "./endpoints/whatsapp";
import { memoryStorage } from "./utils/memory";
import { initPrisma } from "./utils/prisma";
import withCORS from "./utils/with-cors";
import { expenseApprovalWorkflow } from "./workflows";

// Logger
const logger = createPinoLogger({
	name: "my-agent-app",
	level: "info",
});

// Registra endpoints uma única vez
const registerWithCors = (endpoints: CustomEndpointDefinition[]) =>
	registerCustomEndpoints(
		endpoints.map((endpoint) => ({
			...endpoint,
			handler: withCORS(endpoint.handler),
		})),
	);

registerWithCors(userEndpoints);
registerWithCors(srdEndpoints);
registerWithCors(secretaryEndpoints);
registerWithCors(financeiroEndpoints);
registerWithCors(logisticaEndpoints);
registerWithCors(supervisorEndpoints);
registerWithCors(agentEndpoints);
registerWithCors(teamEndpoints);
registerWithCors(tenantEndpoints);
registerWithCors(documentEndpoints);
registerWithCors(agentDocumentEndpoints);
registerWithCors(uploadDirectEndpoints);
registerWithCors(fileEndpoints);
registerWithCors(agentTrainEndpoints);
registerWithCors(conversationEndpoints);
registerWithCors(chatEndpoints);
registerWithCors(contactEndpoints);
registerWithCors(campaignEndpoints);
registerWithCors(dealEndpoints);
registerWithCors(slaConfigEndpoints);
registerWithCors(endoItemEndpoints);
registerWithCors(endoMaterialEndpoints);
registerWithCors(endoActionEndpoints);
registerWithCors(endoPostEndpoints);
registerWithCors(whatsappEndpoints);
registerWithCors(waEndpoints);
registerWithCors(sellerKpiDailyEndpoints);
registerWithCors(teamKpiDailyEndpoints);

// Se seu server precisar PORT/HOST, use estas vars (o VoltAgent pode cuidar disso internamente)
const PORT = Number(process.env.PORT) || 3141;
const HOST = "0.0.0.0";

async function main() {
	await initPrisma();
	// inicializações assíncronas que antes estavam no topo
	try {
		await (
			memoryStorage as unknown as {
				initializeDatabase: () => Promise<void>;
			}
		).initializeDatabase();
	} catch (err) {
		const connection = (
			memoryStorage as unknown as {
				options?: { connection?: string };
			}
		).options?.connection;
		logger.error(
			`Memory database initialization failed (connection=${connection}): ${(err as Error).message}`,
		);
		throw new Error("Memory database initialization failed");
	}

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL not configured");
	}

	const pg = new PostgresStorage({
		connection: databaseUrl, // usa o messages-db
		// schema: "public", // se precisar customizar
	});

	try {
		await (
			pg as unknown as {
				initializeDatabase: () => Promise<void>;
			}
		).initializeDatabase();
	} catch (err) {
		logger.error(
			`PostgreSQL database initialization failed (connection=${databaseUrl}): ${(err as Error).message}`,
		);
		throw new Error("PostgreSQL database initialization failed");
	}

	const publicKey = process.env.VOLTAGENT_PUBLIC_KEY;
	const secretKey = process.env.VOLTAGENT_SECRET_KEY;

	let voltOpsClient: VoltOpsClient | undefined;
	if (publicKey && secretKey) {
		voltOpsClient = new VoltOpsClient({ publicKey, secretKey });

		const originalAddHistoryStep = (
			memoryStorage as unknown as {
				addHistoryStep?: (
					key: string,
					value: unknown,
					historyId: string,
					agentId: string,
				) => Promise<void>;
			}
		).addHistoryStep?.bind(memoryStorage);

		if (originalAddHistoryStep) {
			(
				memoryStorage as unknown as {
					addHistoryStep: (
						key: string,
						value: unknown,
						historyId: string,
						agentId: string,
					) => Promise<void>;
				}
			).addHistoryStep = async (key, value, historyId, agentId) => {
				await originalAddHistoryStep(key, value, historyId, agentId);
				try {
					const exporter = voltOpsClient?.getObservabilityExporter();
					await exporter?.exportHistoryStepsAsync(
						historyId,
						value as unknown as never[],
					);
				} catch (error) {
					if ((error as { statusCode?: number })?.statusCode === 404) {
						logger.warn("History entry not found when exporting steps", error);
					} else {
						logger.error("Failed to export history steps", error);
					}
				}
			};
		}
	} else {
		logger.warn(
			"VoltOps telemetry disabled: missing VOLTAGENT_PUBLIC_KEY or VOLTAGENT_SECRET_KEY",
		);
	}

	new VoltAgent({
		agents: {
			SDRAgent,
			SecretaryAgent,
			FinanceiroAgent,
			LogisticaAgent,
		},
		workflows: {
			expenseApprovalWorkflow,
		},
		server: {
			autoStart: true,
			port: PORT,
		},
		logger,
		...(voltOpsClient ? { voltOpsClient } : {}),
	});

	logger.info(`Boot OK (HOST=${HOST}, PORT=${PORT})`);
}

main().catch((err) => {
	logger.error("Fatal bootstrap error", err);
	process.exit(1);
});
