import type { Prisma } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import {
  bufferFromBlob,
  removeIfExists,
  sanitizeFilename,
  saveBufferToVolume,
  sha256,
  statSafe,
  uniqueSafeName,
} from "../utils/files";
import { uploadBuffer, createSignedUrl, ensureBucketExists } from "../utils/supabase";

// 👇 tipos
import type { DocKind as DocKindT } from "@prisma/client";
// 👇 valores/runtime
import prismaPkg from "@prisma/client";
const { PrismaClient, DocKind } = prismaPkg;
export const prisma = new PrismaClient();

// mapeia mimetype/kind do teu domínio
function toDocKind(label: string): DocKindT | undefined {
	switch (label.toUpperCase()) {
		case "SCRIPT":
			return DocKind.SCRIPT;
		case "CSV":
			return DocKind.CSV;
		case "MEDIA":
			return DocKind.MEDIA;
		case "RULE":
			return DocKind.RULE;
		case "OTHER":
			return DocKind.OTHER;
		default:
			return undefined;
	}
}

function guessKind(mime: string | null, name: string): DocKindT {
    const n = name.toLowerCase();
    if (n.endsWith(".csv")) return DocKind.CSV;
    if (n.endsWith(".xlsx") || n.endsWith(".xls")) return DocKind.OTHER; // tratar como texto processável
    if (n.endsWith(".txt")) return DocKind.OTHER;
    if (
        (mime || "").startsWith("audio/") ||
        (mime || "").startsWith("video/") ||
        (mime || "").startsWith("image/")
    )
        return DocKind.MEDIA;
    return DocKind.OTHER;
}

export const uploadDirectEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/api/uploads/direct",
    method: "post" as const,
    description:
      "[privada] upload para Supabase Storage (se configurado) ou disco local, criando Document",
    handler: async (c: Context): Promise<Response> => {
      const userId = c.req.header("x-user-id");
      if (!userId)
        return c.json({ success: false, message: "missing userId" }, 401);

			const form = await c.req.formData();
			const file = form.get("file") as File | null;
			const tags = form.get("tags");
			const perm = form.get("perm");
			const status = form.get("status");
			const kindOverride = form.get("kind"); // string opcional

			if (!file)
				return c.json({ success: false, message: "missing file" }, 400);

			const originalName = sanitizeFilename(file.name || "upload.bin");
			const mimeType = file.type || null;

			const maxBytes = 50 * 1024 * 1024;
			if (file.size > maxBytes) {
				return c.json({ success: false, message: "file too large" }, 413);
			}

      const buf = await bufferFromBlob(file);
      const finalName = uniqueSafeName(originalName);
      const size = buf.length;
      const hash = sha256(buf);

			// 🔒 garante um Prisma.DocKind (sem undefined)
			const kindEnum: DocKindT =
				toDocKind(typeof kindOverride === "string" ? kindOverride : "") ??
				guessKind(mimeType, originalName);

      const bucket = process.env.SUPABASE_BUCKET;
      const useSupabase =
        !!bucket && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;

      if (useSupabase) {
        // Supabase Storage path: userId/filename
        const objectPath = `${userId}/${finalName}`;
        try {
          // Garantir bucket antes de subir (cria se não existir)
          await ensureBucketExists(bucket, false);
        } catch (e) {
          console.error("[storage] ensureBucketExists failed", e);
          return c.json({ success: false, message: "storage bucket error" }, 500);
        }
        try {
          await uploadBuffer({ bucket, path: objectPath }, buf, mimeType || undefined);
        } catch (e: any) {
          // Log detalhado do erro supabase (status/message)
          console.error("[storage] upload failed", {
            message: e?.message,
            status: e?.originalError?.status,
            statusText: e?.originalError?.statusText,
            url: e?.originalError?.url,
          });
          return c.json({ success: false, message: "storage upload failed" }, 502);
        }

        // Create document pointing to our proxy endpoint; content will be served via signed URL
        const created = await prisma.document.create({
          data: {
            ownerId: userId,
            name: originalName,
            kind: kindEnum,
            mimeType: mimeType ?? undefined,
            url: undefined,
            body: undefined,
            tags: tags
              ? typeof tags === "string" && tags.trim().startsWith("[")
                ? JSON.parse(String(tags))
                : String(tags)
              : undefined,
            status: status ? String(status) : undefined,
            perm: perm ? String(perm) : undefined,
            meta: {
              storage: "supabase",
              bucket,
              path: objectPath,
              savedAs: finalName,
              size,
              sha256: hash,
            } as Prisma.InputJsonValue,
          },
        });

        const fileUrl = `/api/files/${created.id}`;
        await prisma.document.update({ where: { id: created.id }, data: { url: fileUrl } });

        // Optionally, also return a fresh signed URL for immediate use
        let signedUrl: string | undefined;
        try {
          signedUrl = await createSignedUrl({ bucket, path: objectPath }, 600);
        } catch (e) {
          console.warn("[storage] signed url failed", e);
        }

        return c.json(
          {
            success: true,
            data: {
              id: created.id,
              name: originalName,
              mimeType,
              size,
              kind: kindEnum,
              url: fileUrl,
              signedUrl,
            },
          },
          201,
        );
      }

      // Fallback: local disk storage (development or when Supabase is not configured)
      const diskPath = await saveBufferToVolume(buf, finalName);
      const st = await statSafe(diskPath);
      try {
        const created = await prisma.document.create({
          data: {
            ownerId: userId,
            name: originalName,
            kind: kindEnum,
            mimeType: mimeType ?? undefined,
            url: undefined,
            body: undefined,
            tags: tags
              ? typeof tags === "string" && tags.trim().startsWith("[")
                ? JSON.parse(String(tags))
                : String(tags)
              : undefined,
            status: status ? String(status) : undefined,
            perm: perm ? String(perm) : undefined,
            meta: {
              storage: "local",
              path: diskPath,
              savedAs: finalName,
              size: st?.size ?? size,
              sha256: hash,
            } as Prisma.InputJsonValue,
          },
        });
        const fileUrl = `/api/files/${created.id}`;
        await prisma.document.update({ where: { id: created.id }, data: { url: fileUrl } });
        return c.json(
          { success: true, data: { id: created.id, name: originalName, mimeType, size, kind: kindEnum, url: fileUrl } },
          201,
        );
      } catch (err) {
        await removeIfExists(diskPath);
        throw err;
      }
    },
  },
];
