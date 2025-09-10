import {
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
import { chatEndpoints } from "./endpoints/chat";
import { conversationEndpoints } from "./endpoints/conversations";
import { documentEndpoints } from "./endpoints/documents";
import { fileEndpoints } from "./endpoints/files";
import { financeiroEndpoints } from "./endpoints/financeiro";
import { logisticaEndpoints } from "./endpoints/logistica";
import { srdEndpoints } from "./endpoints/sdr";
import { secretaryEndpoints } from "./endpoints/secretary";
import { supervisorEndpoints } from "./endpoints/supervisor";
import { teamEndpoints } from "./endpoints/teams";
import { uploadDirectEndpoints } from "./endpoints/upload-files";
import { userEndpoints } from "./endpoints/user";

import { PostgresStorage } from "@voltagent/postgres";
import { whatsappEndpoints } from "./endpoints/whatsapp";
import { waEndpoints } from "./endpoints/wa";
import { memoryStorage } from "./utils/memory";
import { expenseApprovalWorkflow } from "./workflows";
import { initPrisma } from "./utils/prisma";

// Logger
const logger = createPinoLogger({
	name: "my-agent-app",
	level: "info",
});

// Registra endpoints uma única vez
registerCustomEndpoints(userEndpoints);
registerCustomEndpoints(srdEndpoints);
registerCustomEndpoints(secretaryEndpoints);
registerCustomEndpoints(financeiroEndpoints);
registerCustomEndpoints(logisticaEndpoints);
registerCustomEndpoints(supervisorEndpoints);
registerCustomEndpoints(agentEndpoints);
registerCustomEndpoints(teamEndpoints);
registerCustomEndpoints(documentEndpoints);
registerCustomEndpoints(agentDocumentEndpoints);
registerCustomEndpoints(uploadDirectEndpoints);
registerCustomEndpoints(fileEndpoints);
registerCustomEndpoints(agentTrainEndpoints);
registerCustomEndpoints(conversationEndpoints);
registerCustomEndpoints(chatEndpoints);
registerCustomEndpoints(whatsappEndpoints);
registerCustomEndpoints(waEndpoints);

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
		voltOpsClient: new VoltOpsClient({
			publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
			secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
		}),
	});

	logger.info(`Boot OK (HOST=${HOST}, PORT=${PORT})`);
}

main().catch((err) => {
	logger.error("Fatal bootstrap error", err);
	process.exit(1);
});
