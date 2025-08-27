import crypto from "node:crypto";
// utils/files.ts
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const baseDir = process.env.FILES_DIR || "/data";

export async function ensureBaseDir() {
	await fsp.mkdir(baseDir, { recursive: true });
}

export function sanitizeFilename(name: string) {
	// remove path traversal e caracteres problemáticos
	return name.replace(/[/\\?%*:|"<>]/g, "_").replace(/\.\.+/g, ".");
}

export function uniqueName(original: string) {
	const ext = path.extname(original);
	const stem = path.basename(original, ext);
	const suffix = crypto.randomBytes(8).toString("hex");
	return `${stem}-${suffix}${ext}`;
}

export async function bufferFromBlob(webBlob: Blob) {
	// c.req.formData() retorna Blob no runtime Web API; converte para Buffer
	const ab = await webBlob.arrayBuffer();
	return Buffer.from(ab);
}

export async function saveBufferToVolume(buf: Buffer, filename: string) {
	await ensureBaseDir();
	const finalPath = path.join(baseDir, filename);
	await fsp.writeFile(finalPath, buf);
	return finalPath;
}

export function sha256(buf: Buffer) {
	return crypto.createHash("sha256").update(buf).digest("hex");
}

export async function statSafe(p: string) {
	try {
		return await fsp.stat(p);
	} catch {
		return null;
	}
}

export async function removeIfExists(p: string) {
	try {
		await fsp.unlink(p);
	} catch {}
}
