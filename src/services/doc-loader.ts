import fs from "node:fs/promises";
import path from "node:path";

export async function loadDocumentText(doc: {
	id: string;
	name: string;
	kind: "SCRIPT" | "CSV" | "MEDIA" | "RULE" | "OTHER";
	mimeType?: string | null;
	url?: string | null;
	body?: string | null;
}) {
	// 1) Texto já no banco
	if (
		doc.kind === "SCRIPT" ||
		doc.kind === "RULE" ||
		(doc.kind === "OTHER" && doc.body)
	) {
		return {
			text: String(doc.body ?? ""),
			kind: toKind(doc.kind),
			meta: baseMeta(doc),
		};
	}

	// 2) URL/caminho local
	if (!doc.url)
		return { text: "", kind: toKind(doc.kind), meta: baseMeta(doc) };

	let raw = "";
	if (/^https?:\/\//i.test(doc.url)) {
		const res = await fetch(doc.url);
		if (!res.ok) throw new Error(`download failed: ${res.status}`);
		raw = await res.text();
	} else {
		const full = path.resolve(process.cwd(), doc.url);
		raw = await fs.readFile(full, "utf-8");
	}

	if (
		doc.kind === "CSV" ||
		(doc.mimeType ?? "").toLowerCase().includes("csv") ||
		doc.url.toLowerCase().endsWith(".csv")
	) {
		raw = csvToPlainText(raw, 1000);
	}
	if (doc.kind === "MEDIA") raw = ""; // sem STT por enquanto

	return { text: raw, kind: toKind(doc.kind), meta: baseMeta(doc) };
}

function csvToPlainText(csv: string, maxRows = 1000) {
	return csv.split(/\r?\n/).slice(0, maxRows).join("\n");
}
function baseMeta(d: { id: string; name: string; kind: string }) {
	return {
		docId: d.id,
		docName: d.name,
		kind: toKind(d.kind),
		source: "library",
	};
}
function toKind(x: string) {
	return x.toLowerCase();
}
