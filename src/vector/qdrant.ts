import { QdrantClient } from "@qdrant/js-client-rest";

export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? "voltagent-knowledge-base";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

export async function ensureCollection() {
  const size = process.env.EMBED_MODEL?.includes("large") ? 3072 : 1536;
  try {
    await qdrant.getCollection(QDRANT_COLLECTION);
  } catch {
    await qdrant.createCollection(QDRANT_COLLECTION, {
      vectors: { size, distance: "Cosine" },
    });
  }
}
