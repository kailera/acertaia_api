import OpenAI from "openai";
import { prisma } from "../utils/prisma";
import { ensureCollection, qdrant, QDRANT_COLLECTION } from "../vector/qdrant";
import { loadDocumentText } from "./doc-loader";
import { JobStatus } from "@prisma/client";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const EMBED_MODEL = process.env.EMBED_MODEL ?? "text-embedding-3-small";

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

export async function startAgentTraining(jobId: string): Promise<void> {
  await ensureCollection();

  // marca RUNNING
  const job = await prisma.trainingJob.update({
    where: { id: jobId },
    data: { status: JobStatus.RUNNING },
  });

  const agent = await prisma.agent.findUnique({ where: { id: job.agentId } });
  if (!agent) throw new Error("agent not found");

  // vínculos N:N -> Document
  const links = await prisma.agentDocument.findMany({
    where: { agentId: agent.id },
    include: { document: true },
  });

  const docs = links.map((l) => l.document).filter((d) => d.kind !== "MEDIA");

  let total = 0,
    processed = 0;
  const points: Array<{
    id: string;
    vector: number[];
    payload: Record<string, unknown>;
  }> = [];

  for (const d of docs) {
    const { text, kind, meta } = await loadDocumentText({
      id: d.id,
      name: d.name,
      kind: d.kind,
      mimeType: d.mimeType ?? undefined,
      url: d.url ?? undefined,
      body: d.body ?? undefined,
    });
    if (!text?.trim()) continue;

    const chunks = chunkText(text);
    total += chunks.length;

    // embeddings em lotes
    const B = 64;
    for (let i = 0; i < chunks.length; i += B) {
      const slice = chunks.slice(i, i + B);
      const emb = await openai.embeddings.create({
        model: EMBED_MODEL,
        input: slice,
      });

      for (let j = 0; j < slice.length; j++) {
        points.push({
          id: `${d.id}-${i + j}`,
          vector: emb.data[j].embedding,
          payload: {
            ...meta,
            text: slice[j],
            agentId: agent.id,
            documentId: d.id,
            kind,
          },
        });
      }

      processed += slice.length;
      await prisma.trainingJob.update({
        where: { id: jobId },
        data: { processed, total },
      });
    }
  }

  // upsert em lotes
  for (let i = 0; i < points.length; i += 100) {
    await qdrant.upsert(QDRANT_COLLECTION, {
      points: points.slice(i, i + 100),
    });
  }

  await prisma.trainingJob.update({
    where: { id: jobId },
    data: { status: JobStatus.DONE, processed: total, total },
  });
}
