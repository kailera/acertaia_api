// api/documents.helpers.ts
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { DocKind, AgentDocRole } from "@prisma/client";

// ---- rótulos da UI <-> enums do BD
export const kindFromLabel = (s: string): DocKind => {
  const map = {
    script: "SCRIPT",
    csv: "CSV",
    media: "MEDIA",
    rule: "RULE",
    other: "OTHER",
  } as const;
  const v = map[s as keyof typeof map];
  if (!v) throw new Error(`kind inválido: ${s}`);
  return v as DocKind;
};

export const kindToLabel = (k: DocKind) =>
  ({ SCRIPT: "script", CSV: "csv", MEDIA: "media", RULE: "rule", OTHER: "other" } as const)[k];

export const roleFromLabel = (s: string): AgentDocRole => {
  const map = {
    primary: "PRIMARY",
    extra: "EXTRA",
    csv: "CSV",
    media: "MEDIA",
    rule_override: "RULE_OVERRIDE",
  } as const;
  const v = map[s as keyof typeof map];
  if (!v) throw new Error(`role inválido: ${s}`);
  return v as AgentDocRole;
};

export const roleToLabel = (r: AgentDocRole) =>
  ({ PRIMARY: "primary", EXTRA: "extra", CSV: "csv", MEDIA: "media", RULE_OVERRIDE: "rule_override" } as const)[r];

// ---- payloads
export const DocumentCreatePayload = z.object({
  name: z.string().min(1),
  kind: z.enum(["script", "csv", "media", "rule", "other"]),
  mimeType: z.string().optional(),
  url: z.string().url().optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(), // "rascunho"|"pronto"|"revisão" (livre)
  perm: z.string().optional(),   // "global"|"limitado" (livre)
  meta: z.record(z.any()).optional(), // ex.: {enc,delim,hasHeader,sample,stats,canal,kind}
});

export const DocumentUpdatePayload = DocumentCreatePayload.partial();

export const LinkPayload = z.object({
  documentId: z.string().cuid(),
  role: z.enum(["primary", "extra", "csv", "media", "rule_override"]).optional(), // default pelo kind
});

// verificação de ownership consistente
export async function assertSameOwner(userId: string, agentId: string, documentId: string) {
  const [ag, doc] = await Promise.all([
    prisma.agent.findUnique({ where: { id: agentId }, select: { ownerId: true } }),
    prisma.document.findUnique({ where: { id: documentId }, select: { ownerId: true } }),
  ]);
  if (!ag || !doc) throw new Error("agent/document não encontrado");
  if (ag.ownerId !== userId || doc.ownerId !== userId) throw new Error("forbidden");
}
