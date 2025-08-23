import { openai } from "@ai-sdk/openai";
import { Agent, InMemoryStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { SecretaryScript } from "../scripts/secretary-script";
import { registrationStudentsTool } from "../tools/secretary";
import { scriptGeral } from "../scripts/geral";

const sdrMemory = new InMemoryStorage({
  // Optional: Limit the number of messages stored per conversation thread
  storageLimit: 100, // Defaults to no limit if not specified

  // Optional: Enable verbose debug logging from the memory provider
  debug: true, // Defaults to false
});

export const SecretaryAgent = new Agent({
  name: "Anne",
  instructions: `${SecretaryScript} ${scriptGeral}`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [registrationStudentsTool],
  subAgents: [],
  purpose: "Agente de secretária que faz a gestão de documentos e matrículas",
  memory: sdrMemory,
  userContext: new Map([["environment", "production"]]),
});

// aquui é dado a resposta // retorne a resposta inteira e quebre em chunks
export async function SecretaryChat(
  input: string,
  userId: string,
  conversationId: string
) {
  console.log(`User: ${input}`);
  // Use streamText for interactive responses
  const result = await SecretaryAgent.generateText(input, {
    userId,
    conversationId,
  });

  return result;
}
