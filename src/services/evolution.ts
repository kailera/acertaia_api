// Simple wrapper to call Evolution API
import "dotenv/config";

const EVO_URL = process.env.EVOLUTION_URL || "";
const EVO_API_KEY = process.env.EVO_API_KEY || process.env.EVO_APIKEY || "";
const EVO_SENDTEXT_PATH_TMPL =
	process.env.EVOLUTION_SENDTEXT_PATH || "/message/sendText"; // supports {instance}
const EVO_APIKEY_IN = (
	process.env.EVOLUTION_APIKEY_IN || "header"
).toLowerCase(); // 'header' | 'query'

// Low-level: returns the raw Response so callers can inspect status/body
export async function sendTextEvolution(
	instanceName: string,
	toOrJid: string,
	text: string,
) {
	if (!EVO_URL || !EVO_API_KEY)
		throw new Error("missing EVOLUTION_URL or EVO_API_KEY env");
	const base = EVO_URL.replace(/\/$/, "");
	const numberPart = toOrJid.includes("@") ? toOrJid.split("@")[0] : toOrJid;
	const digits = numberPart.replace(/[^0-9]/g, "");

	const buildHeaders = (urlWithMaybeQuery: string) => {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (EVO_APIKEY_IN === "header")
			return { url: urlWithMaybeQuery, headers } as const;
		const sep = urlWithMaybeQuery.includes("?") ? "&" : "?";
		return {
			url: `${urlWithMaybeQuery}${sep}apikey=${encodeURIComponent(EVO_API_KEY)}`,
			headers,
		} as const;
	};
	const applyApiKeyHeader = (h: Record<string, string>) => {
		if (EVO_APIKEY_IN === "header") h.apikey = EVO_API_KEY;
		return h;
	};

	// 1) Prefer modern path: instance in URL
	{
		const pathV2 =
			`/message/sendText/${encodeURIComponent(instanceName)}`.replace(
				/^\/+/,
				"",
			);
		const { url, headers } = buildHeaders(`${base}/${pathV2}`);
		const res = await fetch(url, {
			method: "POST",
			headers: applyApiKeyHeader(headers),
			body: JSON.stringify({ number: digits, text }),
		});
		if (res.status !== 404) return res; // success or other error -> return as-is
	}

	// 2) Fallback legacy or configured path
	{
		const pathTmpl = (EVO_SENDTEXT_PATH_TMPL || "/message/sendText").replace(
			/^\/+/,
			"",
		);
		const pathLegacy = pathTmpl.includes("{instance}")
			? pathTmpl.replace("{instance}", encodeURIComponent(instanceName))
			: pathTmpl;
		const { url, headers } = buildHeaders(`${base}/${pathLegacy}`);
		const body = pathTmpl.includes("{instance}")
			? { number: digits, text }
			: { instanceName, number: digits, text };
		return fetch(url, {
			method: "POST",
			headers: applyApiKeyHeader(headers),
			body: JSON.stringify(body),
		});
	}
}

// Back-compat helper (kept if needed elsewhere)
export async function evoSendText(instance: string, to: string, text: string) {
	const res = await sendTextEvolution(instance, to, text);
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		throw new Error(`evolution sendText failed: ${res.status} ${body}`);
	}
	return res.json().catch(() => ({}));
}
