import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { CustomEndpointDefinition } from "@voltagent/core";
// api/files.endpoints.ts
import type { Context } from "hono";
import { prisma } from "../utils/prisma";

export const fileEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/files/:id",
		method: "get" as const,
		description: "[privada] serve o arquivo do documento por ID (streaming)",
		handler: async (c: Context): Promise<Response> => {
			const userId = (c.req.header("x-user-id") || "").trim();
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);

			const id = c.req.param("id");
			console.log(
				"[FILES] userId=",
				JSON.stringify(c.req.header("x-user-id")),
				"id=",
				c.req.param("id"),
			);

			// 1) Busque pelo id primeiro
			const d = await prisma.document.findUnique({ where: { id } });
			if (!d) {
				return c.json(
					{ success: false, message: "not found (doc)", id, userId },
					404,
				);

				// doc realmente não existe
			}

			// 2) Verifique ownership separado para erro mais claro
			if (d.ownerId !== userId) {
				return c.json(
					{ success: false, message: "forbidden (owner mismatch)" },
					403,
				);
			}

			// 3) Caminho físico
			const meta = (d.meta as Record<string, unknown>) || {};
			let p: string | undefined = meta.path as string | undefined;
			if (!p)
				return c.json({ success: false, message: "file path missing" }, 500);

			p = path.normalize(p);

			if (!fs.existsSync(p)) {
				return c.json(
					{ success: false, message: "file not found on disk", path: p },
					410,
				);
			}

			const fileStream = fs.createReadStream(p);
			const webStream = Readable.toWeb(
				fileStream,
			) as unknown as ReadableStream<Uint8Array>;

			const mime = d.mimeType || "application/octet-stream";
			const isDownload = c.req.query("download") === "1";
			const headers: Record<string, string> = { "Content-Type": mime };
			if (isDownload)
				headers["Content-Disposition"] =
					`attachment; filename="${encodeURIComponent(d.name)}"`;

			return new Response(webStream, { headers, status: 200 });
		},
	},
];
