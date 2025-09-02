// Simple wrapper to call Evolution API
import "dotenv/config";

const EVO_URL = process.env.EVOLUTION_URL || "";
const EVO_API_KEY = process.env.EVO_API_KEY || process.env.EVO_APIKEY || "";

// Low-level: returns the raw Response so callers can inspect status/body
export async function sendTextEvolution(instanceName: string, toOrJid: string, text: string) {
  if (!EVO_URL || !EVO_API_KEY) throw new Error("missing EVOLUTION_URL or EVO_API_KEY env");
  const url = `${EVO_URL.replace(/\/$/, "")}/message/sendText`;
  // Evolution expects digits-only phone in field `number`
  const numberPart = toOrJid.includes("@") ? toOrJid.split("@")[0] : toOrJid;
  const digits = numberPart.replace(/[^0-9]/g, "");
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: EVO_API_KEY,
    },
    body: JSON.stringify({ instanceName, number: digits, text }),
  });
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
