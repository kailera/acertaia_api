import { openai } from "@ai-sdk/openai";
import { Agent, InMemoryStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { SRDScript } from "../scripts/sdr-script";

export const SDRAgent = new Agent({
  name: "SOFIA",
  instructions: SRDScript,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [],
  subAgents: [],
  purpose: "Agente de SRD",
  userContext: new Map([["environment", "production"]]),
});

// aquui é dado a resposta // retorne a resposta inteira e quebre em chunks
export async function SDRChat(
  input: string,
  userId: string,
  conversationId: string
) {
  console.log(`User: ${input}`);
  // Use streamText for interactive responses
  const result = await SDRAgent.generateText(input, {
    userId,
    conversationId,
  });

  return result;
}
