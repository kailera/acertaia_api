import {
  VoltAgent,
  VoltOpsClient,
  registerCustomEndpoints,
} from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import "dotenv/config";

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
import { memoryStorage } from "./utils/memory";
import { expenseApprovalWorkflow } from "./workflows";

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

// Se seu server precisar PORT/HOST, use estas vars (o VoltAgent pode cuidar disso internamente)
const PORT = Number(process.env.PORT) || 3141;
const HOST = "0.0.0.0";

async function main() {
  // inicializações assíncronas que antes estavam no topo
  await (
    memoryStorage as unknown as { initializeDatabase: () => Promise<void> }
  ).initializeDatabase();

  const pg = new PostgresStorage({
    connectionString: process.env.DATABASE_URL!, // usa o messages-db
    // schema: "public", // se precisar customizar
  });

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
