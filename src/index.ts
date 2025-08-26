
import {

  registerCustomEndpoints,
  VoltAgent,
  VoltOpsClient,
} from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import "dotenv/config";
import { userEndpoints } from "./endpoints/user";
import { expenseApprovalWorkflow } from "./workflows";
import { SDRAgent } from "./agents/sdr";
import { srdEndpoints } from "./endpoints/sdr";
import { secretaryEndpoints } from "./endpoints/secretary";
import { SecretaryAgent } from "./agents/secretary";
import {agentEndpoints} from "./endpoints/agents"
import {teamEndpoints} from "./endpoints/teams"
import { supervisorEndpoints } from "./endpoints/supervisor";
import { agentDocumentEndpoints } from "./endpoints/agents-docs";
import { documentEndpoints } from "./endpoints/documents";
import { uploadDirectEndpoints } from "./endpoints/upload-files";
import { fileEndpoints } from "./endpoints/files";

// Create a logger instance
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

registerCustomEndpoints(userEndpoints);
registerCustomEndpoints(srdEndpoints)
registerCustomEndpoints(secretaryEndpoints)
registerCustomEndpoints(supervisorEndpoints)
registerCustomEndpoints(agentEndpoints)
registerCustomEndpoints(teamEndpoints)
registerCustomEndpoints(documentEndpoints)
registerCustomEndpoints(agentDocumentEndpoints)
registerCustomEndpoints(uploadDirectEndpoints)
registerCustomEndpoints(fileEndpoints)

new VoltAgent({
  agents: {
    SDRAgent,
    SecretaryAgent,
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
