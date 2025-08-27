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
import { expenseApprovalWorkflow } from "./workflows";

// Create a logger instance
const logger = createPinoLogger({
	name: "my-agent-app",
	level: "info",
});

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
