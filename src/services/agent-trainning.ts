import { $Enums } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { EMBED_MODEL, openaiClient } from "../utils/openai";
import { prisma } from "../utils/prisma";
import { QDRANT_COLLECTION, ensureCollection, qdrant } from "../vector/qdrant";
import { loadDocumentText } from "./doc-loader";

const openai = openaiClient;

function chunkText(s: string, size = 1800, overlap = 400) {
	if (!s) return [];
	const out: string[] = [];
	let i = 0;
	while (i < s.length) {
		const end = Math.min(i + size, s.length);
		out.push(s.slice(i, end));
		i = Math.max(end - overlap, end);
	}
	return out;
}

export async function startAgentTraining(jobId: string) {
	console.info(`[train] start job=${jobId}`);
	await ensureCollection(1536);
	console.info(`[train] ensured collection dim=1536 name=${QDRANT_COLLECTION}`);

	// marca RUNNING
	const job = await prisma.trainingJob.update({
		where: { id: jobId },
		data: { status: "RUNNING" },
	});
	console.info(`[train] job running: jobId=${jobId} agentId=${job.agentId}`);

	const agent = await prisma.agent.findUnique({ where: { id: job.agentId } });
	if (!agent) throw new Error("agent not found");
	console.info(`[train] agent loaded: id=${agent.id} nome=${agent.nome}`);

	// vínculos N:N -> Document
	const links = await prisma.agentDocument.findMany({
		where: { agentId: agent.id },
		include: { document: true },
	});

	const docs = links.map((l) => l.document).filter((d) => d.kind !== "MEDIA");
	console.info(`[train] documents linked: total=${docs.length}`);

	const points: Array<{
		id: string;
		vector: number[];
		payload: Record<string, unknown>;
	}> = [];

	for (const d of docs) {
		console.info(`[train] load doc id=${d.id} name=${d.name} kind=${d.kind}`);
    const { text, kind } = await loadDocumentText({
        id: d.id,
        name: d.name,
        kind: d.kind,
        mimeType: d.mimeType ?? undefined,
        url: d.url ?? undefined,
        body: d.body ?? undefined,
        meta: (d as any).meta,
        ownerId: (d as any).ownerId,
    });
		if (!text?.trim()) {
			console.warn(`[train] empty text skipped: id=${d.id} name=${d.name}`);
			continue;
		}

		const chunks = chunkText(text, 1800, 400);
		console.info(`[train] chunked: docId=${d.id} chunks=${chunks.length}`);

		// embeddings em lotes
		const B = 64;
		for (let i = 0; i < chunks.length; i += B) {
			const slice = chunks.slice(i, i + B);
			const emb = await openai.embeddings.create({
				model: EMBED_MODEL,
				input: slice,
			});

            for (let j = 0; j < slice.length; j++) {
                const chunk = i + j;
                points.push({
                    id: randomUUID(),
                    vector: emb.data[j].embedding,
                    payload: {
                        agentId: agent.id,
                        documentId: d.id,
                        kind,
                        text: slice[j],
                        docName: d.name,
                        chunk,
                    },
                });
            }
		}
	}

	// upsert em lotes
	console.info(`[train] upserting points: total=${points.length}`);
	for (let i = 0; i < points.length; i += 100) {
		console.info(`[train] upsert batch: from=${i} to=${Math.min(i + 100, points.length)}`);
		await qdrant.upsert(QDRANT_COLLECTION, {
			points: points.slice(i, i + 100),
		});
	}

	await prisma.trainingJob.update({
		where: { id: jobId },
		data: { status: $Enums.JobStatus.DONE },
	});
	console.info(`[train] job done: jobId=${jobId} agentId=${job.agentId} points=${points.length}`);
}
