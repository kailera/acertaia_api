import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import {
	bufferFromBlob,
	removeIfExists,
	sanitizeFilename,
	saveBufferToVolume,
	sha256,
	statSafe,
	uniqueName,
} from "../utils/files";

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
	if (n.endsWith(".xlsx") || n.endsWith(".xls")) return DocKind.MEDIA; // ajuste se houver enum específico p/ planilha
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
			"[privada] upload multipart para volume docker e criação de document",
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

			const finalName = uniqueName(originalName);
			const diskPath = await saveBufferToVolume(buf, finalName);
			const st = await statSafe(diskPath);
			const size = st?.size ?? buf.length;
			const hash = sha256(buf);

			// 🔒 garante um Prisma.DocKind (sem undefined)
			const kindEnum: DocKindT =
				toDocKind(typeof kindOverride === "string" ? kindOverride : "") ??
				guessKind(mimeType, originalName);

			try {
				const created = await prisma.document.create({
					data: {
						ownerId: userId,
						name: originalName,
						kind: kindEnum, // ✔ agora é Prisma.DocKind
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
							size,
							sha256: hash,
						} as unknown,
					},
				});

				const fileUrl = `/api/files/${created.id}`;
				await prisma.document.update({
					where: { id: created.id },
					data: { url: fileUrl },
				});

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
						},
					},
					201,
				);
			} catch (err: unknown) {
				await removeIfExists(diskPath);
				throw err;
			}
		},
	},
];
