import fs from "node:fs/promises";
import path from "node:path";
import { createSignedUrl } from "../utils/supabase";

// Lazy import to avoid loading unless needed
async function loadXLSX() {
  const mod: any = await import("xlsx");
  return mod?.default ?? mod; // handle both ESM and CJS shapes
}

export async function loadDocumentText(doc: {
    id: string;
    name: string;
    kind: "SCRIPT" | "CSV" | "MEDIA" | "RULE" | "OTHER";
    mimeType?: string | null;
    url?: string | null;
    body?: string | null;
    // optional hints to load from storage without going through auth-protected endpoint
    meta?: any;
    ownerId?: string | null;
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

    // 2) Se houver meta do storage, tente usar diretamente
    if (doc.meta && typeof doc.meta === "object") {
        const storage = String(doc.meta.storage || "");
        if (storage === "supabase" && doc.meta.bucket && doc.meta.path) {
            try {
                const signed = await createSignedUrl({ bucket: String(doc.meta.bucket), path: String(doc.meta.path) }, 600);
                const res = await fetch(signed);
                if (!res.ok) throw new Error(`download failed: ${res.status}`);
                const buf = new Uint8Array(await res.arrayBuffer());
                if (isSpreadsheetLike(doc, String(doc.url))) {
                    const txt = await spreadsheetToText(buf);
                    return { text: txt, kind: toKind(doc.kind), meta: baseMeta(doc) };
                }
                const txt = new TextDecoder().decode(buf);
                return { text: txt, kind: toKind(doc.kind), meta: baseMeta(doc) };
            } catch (e) {
                // fall back below
            }
        }
        if (storage === "local" && doc.meta.path) {
            try {
                const full = path.resolve(String(doc.meta.path));
                if (isSpreadsheetLike(doc, String(full))) {
                    const buf = await fs.readFile(full);
                    const txt = await spreadsheetToText(buf);
                    return { text: txt, kind: toKind(doc.kind), meta: baseMeta(doc) };
                }
                const raw = await fs.readFile(full, "utf-8");
                return { text: raw, kind: toKind(doc.kind), meta: baseMeta(doc) };
            } catch {
                // fall back
            }
        }
    }

    // 3) URL/caminho local via URL (relativa/absoluta)
    if (!doc.url)
        return { text: "", kind: toKind(doc.kind), meta: baseMeta(doc) };

    // Normalize potential relative URLs from our own API
    let url = doc.url;
    if (!/^https?:\/\//i.test(url) && url.startsWith("/")) {
        const base = process.env.PUBLIC_BASE_URL || "";
        if (base) {
            url = base.replace(/\/$/, "") + url;
        }
    }

    const isHttp = /^https?:\/\//i.test(url);
    const isSpreadsheet = isSpreadsheetLike(doc, String(url));

    let raw = "";
    if (isHttp) {
        const headers: Record<string, string> = {};
        if (doc.ownerId) headers["x-user-id"] = doc.ownerId;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`download failed: ${res.status}`);
        if (isSpreadsheet) {
            const buf = new Uint8Array(await res.arrayBuffer());
            raw = await spreadsheetToText(buf);
        } else {
            raw = await res.text();
        }
    } else {
        const full = path.resolve(process.cwd(), url);
        if (isSpreadsheet || /\.(xlsx|xls)$/i.test(full)) {
            const buf = await fs.readFile(full);
            raw = await spreadsheetToText(buf);
        } else {
            raw = await fs.readFile(full, "utf-8");
        }
    }

    if (
        doc.kind === "CSV" ||
        (doc.mimeType ?? "").toLowerCase().includes("csv") ||
        String(url).toLowerCase().endsWith(".csv")
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

function isSpreadsheetLike(doc: { mimeType?: string | null; name: string }, url?: string) {
  return (
    /spreadsheet|excel|officedocument\.spreadsheetml/.test((doc.mimeType || "").toLowerCase()) ||
    /\.xlsx$/i.test(doc.name) ||
    /\.xls$/i.test(doc.name) ||
    (url ? /\.xlsx$/i.test(url) || /\.xls$/i.test(url) : false)
  );
}

async function spreadsheetToText(buf: Uint8Array | Buffer) {
  const xlsx = await loadXLSX();
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheetNames = wb.SheetNames || [];
  if (!sheetNames.length) return "";
  const first = wb.Sheets[sheetNames[0]];
  if (!first) return "";
  // Convert to CSV-like text; you can tweak options if needed
  const csv = xlsx.utils.sheet_to_csv(first, { FS: ",", RS: "\n" });
  // Optionally limit rows for safety
  return csv
    .split(/\r?\n/)
    .slice(0, 2000)
    .join("\n");
}
