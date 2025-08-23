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

// Create a logger instance
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

registerCustomEndpoints(userEndpoints);


const dataAnalysisAgent = new Agent({
  name: "Endomarketing Data Analysis Agent",
  purpose:
    "Análise de dados de vendas, conversas e interações dos vendedores com com os clientes",
  instructions:
    "Analise os dados de vendas e retorne pontos positivos, negativos com sugestões das vendas",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
});

const fileReportAgent = new Agent({
  name: "File research and report Agent",
  purpose:
    "Ingestão de relatórios, arquivos, dados de crm e geração de relatórios analíticos",
  instructions:
    "Analise os dados de vendas e retorne pontos positivos, negativos com sugestões das vendas",
  llm: new VercelAIProvider(),
  model: cohere("command-r-plus"),
});

const agentEndomarketing = new Agent({
  name: "",
  instructions:
    "Um Agente de endomarketing que analisa os resultados de vendas dos vendedores diretamente com os clientes",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  subAgents: [dataAnalysisAgent, fileReportAgent],
  purpose: "Agente de Endomarketing",
  memory: new LibSQLStorage({
    url: "file:./voltagent-memory.db",
    tablePrefix: "endomarketing_memory",
  }),
  memoryOptions: { maxMessages: 100 },
  userContext: new Map([["environment", "production"]]),
});


const matriculaAgent = new Agent({
  name: "",
  instructions:
    `Um Agente de matriculas que trata de :
      historico escolar,
      rematricula, matricula
      cadastro de alunos, 
      envio de documentos
      transferencias.
    `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  subAgents: [dataAnalysisAgent, fileReportAgent],
  purpose: "Agente de Endomarketing",
  memory: new LibSQLStorage({
    url: "file:./voltagent-memory.db",
    tablePrefix: "endomarketing_memory",
  }),
  memoryOptions: { maxMessages: 100 },
  userContext: new Map([["environment", "production"]]),
});


new VoltAgent({
  agents: {
    agentEndomarketing,
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
