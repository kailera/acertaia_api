import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { prisma } from "../utils/prisma";
import { ensureInstanceAccess } from "../utils/auth";
import { sendTextEvolution } from "../services/evolution";

function pickText(msg: any): string | undefined {
  const m = msg?.message || msg;
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    m?.templateButtonReplyMessage?.selectedId ||
    m?.buttonsResponseMessage?.selectedButtonId ||
    m?.listResponseMessage?.title ||
    undefined
  );
}

async function saveMessage(doc: {
  instance: string;
  remoteJid: string;
  fromMe?: boolean;
  messageId?: string;
  pushName?: string;
  body?: string;
  timestamp?: Date | number | string;
}) {
  // Idempotent-ish: avoid duplicates by messageId+instance
  if (doc.messageId) {
    const existing = await prisma.messages.findFirst({
      where: { messageId: doc.messageId, instance: doc.instance },
      select: { id: true },
    });
    if (existing) return existing;
  }
  return prisma.messages.create({
    data: {
      instance: doc.instance,
      remoteJid: doc.remoteJid,
      fromMe: doc.fromMe,
      messageId: doc.messageId,
      pushName: doc.pushName,
      message: doc.body,
      sendAt: doc.timestamp ? new Date(doc.timestamp) : undefined,
    },
  });
}

export const waEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/instances/:instance/verify",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const instance = c.req.param("instance");
      try {
        const { userId } = await ensureInstanceAccess(c, instance);
        const last = await prisma.messages.findFirst({
          where: { instance },
          orderBy: { sendAt: "desc" },
          select: { sendAt: true },
        });
        return c.json(
          {
            success: true,
            data: {
              belongs: true,
              userId,
              hasMessages: Boolean(last?.sendAt),
              lastMessageAt: last?.sendAt ?? null,
            },
          },
          200,
        );
      } catch (err: unknown) {
        return c.json({ success: true, data: { belongs: false } }, 200);
      }
    },
    description: "[auth] Verify if user owns instance and if it has activity",
  },
  {
    path: "/api/wa/webhook",
    method: "post" as const,
    handler: async (c: Context): Promise<Response> => {
      const body = await c.req.json().catch(() => ({}));
      const instance = (body.instanceName || body.instance || c.req.query("instance") || "").toString();
      if (!instance) {
        return c.json({ success: false, message: "missing instance" }, 400);
      }

      const items: any[] =
        body?.parsedMessages ||
        body?.messages ||
        body?.data?.messages ||
        Array.isArray(body) ? body : [];

      if (!Array.isArray(items) || items.length === 0) {
        return c.json({ success: true, message: "no-op" }, 200);
      }

      try {
        const saved = [] as any[];
        for (const it of items) {
          // Support two shapes: our ParsedMessage or Evolution's Baileys-ish event
          if (it?.remoteJid || it?.message) {
            const msg = await saveMessage({
              instance,
              remoteJid: (it.remoteJid || it.key?.remoteJid || "").toString(),
              fromMe: Boolean(it.fromMe ?? it.key?.fromMe),
              messageId: it.messageId || it.key?.id,
              pushName: it.pushName || it?.participant || undefined,
              body: it.message || pickText(it),
              timestamp: it.sentAt || it.messageTimestamp || Date.now(),
            });
            saved.push(msg);
          }
        }
        return c.json({ success: true, data: { count: saved.length } }, 201);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "error";
        return c.json({ success: false, message }, 400);
      }
    },
    description: "[public] Evolution webhook: messages upsert/update",
  },

  {
    path: "/instances/:instance/chats",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const instance = c.req.param("instance");
      const q = (c.req.query("q") || "").toString().toLowerCase();
      const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
      const offset = Math.max(parseInt(c.req.query("offset") || "0", 10), 0);

      try {
        await ensureInstanceAccess(c, instance);

        // Fetch recent messages for this instance, then reduce to chats by remoteJid
        const recent = await prisma.messages.findMany({
          where: { instance },
          orderBy: { sendAt: "desc" },
          take: 500,
          select: {
            id: true,
            remoteJid: true,
            fromMe: true,
            message: true,
            sendAt: true,
            pushName: true,
          },
        });

        const map = new Map<string, typeof recent[number]>();
        for (const m of recent) {
          if (!map.has(m.remoteJid || "")) map.set(m.remoteJid || "", m);
        }

        let rows = Array.from(map.values());
        if (q) {
          rows = rows.filter((r) =>
            (r.pushName || "").toLowerCase().includes(q) || (r.remoteJid || "").toLowerCase().includes(q),
          );
        }

        const page = rows.slice(offset, offset + limit);
        const data = page.map((r) => ({
          id: r.remoteJid,
          name: r.pushName || r.remoteJid,
          unreadCount: 0, // no read-state tracking yet
          lastMessage: { body: r.message, timestamp: r.sendAt },
        }));

        return c.json({ success: true, data, total: rows.length }, 200);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "error";
        return c.json({ success: false, message }, 403);
      }
    },
    description: "[auth] List chats for instance",
  },

  {
    path: "/instances/:instance/messages",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const instance = c.req.param("instance");
      const jid = (c.req.query("jid") || "").toString();
      const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
      const offset = Math.max(parseInt(c.req.query("offset") || "0", 10), 0);
      if (!jid) return c.json({ success: false, message: "missing jid" }, 400);

      try {
        await ensureInstanceAccess(c, instance);
        const items = await prisma.messages.findMany({
          where: { instance, remoteJid: jid },
          orderBy: { sendAt: "desc" },
          skip: offset,
          take: limit,
          select: {
            id: true,
            fromMe: true,
            message: true,
            sendAt: true,
            messageId: true,
          },
        });
        const data = items.map((m) => ({
          id: m.id,
          key: { fromMe: m.fromMe },
          body: m.message,
          timestamp: m.sendAt,
          messageId: m.messageId,
        }));
        return c.json({ success: true, data }, 200);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "error";
        return c.json({ success: false, message }, 403);
      }
    },
    description: "[auth] List messages by jid",
  },

  {
    path: "/instances/:instance/contact",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const instance = c.req.param("instance");
      const jid = (c.req.query("jid") || "").toString();
      if (!jid) return c.json({ success: false, message: "missing jid" }, 400);
      try {
        await ensureInstanceAccess(c, instance);
        const m = await prisma.messages.findFirst({
          where: { instance, remoteJid: jid },
          orderBy: { sendAt: "desc" },
          select: { pushName: true },
        });
        return c.json({ success: true, data: { jid, name: m?.pushName, pushName: m?.pushName } }, 200);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "error";
        return c.json({ success: false, message }, 403);
      }
    },
    description: "[auth] Get contact by jid",
  },

  {
    path: "/instances/:instance/send",
    method: "post" as const,
    handler: async (c: Context): Promise<Response> => {
      const instance = c.req.param("instance");
      const body = await c.req.json().catch(() => ({} as any));
      const dest = String(body.to || body.jid || body.remoteJid || "").trim();
      const msg = String(body.text || body.message || body.body || "").trim();
      if (!dest || !msg) {
        return c.json({ success: false, message: "missing to or text" }, 400);
      }
      try {
        await ensureInstanceAccess(c, instance);
        const evoRes = await sendTextEvolution(instance, dest, msg);
        const evoJson = await evoRes.json().catch(() => ({}));
        if (!evoRes.ok) {
          return c.json({ success: false, message: "evolution error", data: evoJson }, 502);
        }
        // Persist sent message (optional but useful)
        await saveMessage({
          instance,
          remoteJid: dest,
          fromMe: true,
          messageId: evoJson?.key?.id || evoJson?.messageId || undefined,
          body: msg,
          timestamp: Date.now(),
        });
        return c.json({ success: true, data: evoJson }, 200);
      } catch (e: unknown) {
        console.error("send error", e);
        return c.json({ success: false, message: "internal error" }, 500);
      }
    },
    description: "[auth] Send text via Evolution and persist",
  },
];
