import { QdrantClient } from "@qdrant/js-client-rest";

export const QDRANT_COLLECTION =
  process.env.QDRANT_COLLECTION ?? "voltagent-knowledge-base";

// Prefer explicit cloud envs; fallback to generic names; final fallback omitted
const qdrantUrl =
  process.env.QDRANT_CLOUD_URL || process.env.QDRANT_URL || "";
const qdrantApiKey =
  process.env.QDRANT_CLOUD_KEY || process.env.QDRANT_API_KEY || undefined;

if (!qdrantUrl) {
  throw new Error(
    "QDRANT_CLOUD_URL or QDRANT_URL is not set (configure your Qdrant endpoint)",
  );
}

export const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

export async function ensureCollection(dim = 1536) {
	try {
		await qdrant.getCollection(QDRANT_COLLECTION);
	} catch {
		await qdrant.createCollection(QDRANT_COLLECTION, {
			vectors: { size: dim, distance: "Cosine" },
		});
	}

	for (const field of ["agentId", "documentId"]) {
		try {
			await qdrant.createPayloadIndex(QDRANT_COLLECTION, {
				field_name: field,
				field_schema: "keyword",
			});
		} catch {
			/* empty */
		}
	}
}
