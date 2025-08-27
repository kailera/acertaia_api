import { QdrantClient } from "@qdrant/js-client-rest";

export const QDRANT_COLLECTION =
	process.env.QDRANT_COLLECTION ?? "voltagent-knowledge-base";

const qdrantUrl = process.env.QDRANT_URL;
if (!qdrantUrl) {
	throw new Error("QDRANT_URL is not set");
}

export const qdrant = new QdrantClient({
	url: qdrantUrl,
	apiKey: process.env.QDRANT_API_KEY || undefined,
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
