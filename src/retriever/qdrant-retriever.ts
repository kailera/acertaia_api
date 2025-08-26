import { BaseRetriever, type BaseMessage, type RetrieveOptions } from "@voltagent/core";
import OpenAI from "openai";
import { qdrant, QDRANT_COLLECTION } from "../vector/qdrant";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const EMBED_MODEL = process.env.EMBED_MODEL ?? "text-embedding-3-small";

async function embed(text: string) {
  const r = await openai.embeddings.create({ model: EMBED_MODEL, input: text });
  return r.data[0].embedding;
}

export function makeQdrantRetriever(agentId: string) {
  return new class QdrantRetriever extends BaseRetriever {
    async retrieve(input: string | BaseMessage[], options: RetrieveOptions): Promise<string> {
      const text = typeof input === "string"
        ? input
        : Array.isArray(input) && input.length
          ? (Array.isArray(input.at(-1)!.content)
              ? (input.at(-1)!.content as any[]).filter(p => p.type === "text").map(p => p.text).join(" ")
              : String(input.at(-1)!.content))
          : "";
      if (!text.trim()) return "No query text provided.";

      const vector = await embed(text);
      const results = await qdrant.search(QDRANT_COLLECTION, {
        vector, limit: 6, with_payload: true, score_threshold: 0.2,
        filter: { must: [{ key: "agentId", match: { value: agentId } }] },
      });

      if (!results?.length) return "No relevant documents found in the knowledge base.";

      if (options.userContext) {
        options.userContext.set("references", results.map((m: any, i: number) => ({
          id: String(m.id),
          title: m.payload?.docName ?? m.payload?.name ?? `Document ${i + 1}`,
          source: "Qdrant",
          score: m.score,
          category: m.payload?.kind,
        })));
      }

      return results.map((m: any, i: number) =>
        `Document ${i + 1} (ID: ${m.id}, Score: ${m.score?.toFixed(4)}, Kind: ${m.payload?.kind}):\n${m.payload?.text ?? ""}`
      ).join("\n\n---\n\n");
    }
  }();
}
