import { cohere } from "@ai-sdk/cohere";
import { openai } from "@ai-sdk/openai";
import {
  Agent,
  LibSQLStorage,
  registerCustomEndpoints,
  VoltAgent,
  VoltOpsClient,
} from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import "dotenv/config";
import { userEndpoints } from "./endpoints/user";
import { retriever } from "./retriever";
import { weatherTool } from "./tools";
import { expenseApprovalWorkflow } from "./workflows";
import { SDRAgent } from "./agents/sdr";
import { srdEndpoints } from "./endpoints/sdr";
import { secretaryEndpoints } from "./endpoints/secretary";
import { SecretaryAgent } from "./agents/secretary";

// Create a logger instance
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

registerCustomEndpoints(userEndpoints);
registerCustomEndpoints(srdEndpoints)
registerCustomEndpoints(secretaryEndpoints)


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
