import { AgentType } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { ensureInstanceAccess } from "../utils/auth";
import { prisma } from "../utils/prisma";

function getReply(res: unknown): string | undefined {
  const r = res as any;
  return (
    r?.reply ??
    r?.text ??
    r?.output_text ??
    r?.content ??
    r?.message ??
    (Array.isArray(r?.choices) && (r.choices[0]?.message?.content?.[0]?.text || r.choices[0]?.message?.content)) ??
    (typeof r === "string" ? r : undefined)
  );
}

// biome-ignore lint/suspicious/noExplicitAny: flexible message shape
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
			// biome-ignore lint/suspicious/noExplicitAny: unknown body shape
			const body = await c.req.json().catch(() => ({}) as any);
			const instance = (
				body.instanceName ||
				body.instance ||
				c.req.query("instance") ||
				""
			).toString();
			if (!instance) {
				return c.json({ success: false, message: "missing instance" }, 400);
			}

			// biome-ignore lint/suspicious/noExplicitAny: flexible input
			let items: any[] =
				body?.parsedMessages ||
				body?.messages ||
				body?.data?.messages ||
				(Array.isArray(body) ? body : []);
			// Accept simplified shape: single object with remoteJid/message (for testing/frontend)
			if ((!items || items.length === 0) && (body?.remoteJid || body?.key?.remoteJid) && (body?.message || body?.body)) {
				items = [body];
			}

			if (!Array.isArray(items) || items.length === 0) {
				return c.json({ success: true, message: "no-op" }, 200);
			}

			try {
				// biome-ignore lint/suspicious/noExplicitAny: flexible message shape
				const saved: any[] = [];
				const replies: Array<{ remoteJid: string; reply: string; conversationId: string }> = [];
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

				// Route to the right agent: primary WHATSAPP agent of the owner; fallback to Secretary
				try {
					if (saved.length) {
						const owner = await prisma.whatsappNumbers.findFirst({
							where: { instance },
							select: { userId: true },
						});
						const input = saved
							.map((m) => m.message)
							.filter(Boolean)
							.join(". ");
						const userId = saved[0]?.remoteJid;
						const sendAt = saved[0]?.sendAt as Date | undefined;
						const conversationId =
							saved[0]?.messageId && sendAt
								? `${saved[0].messageId}_${new Date(sendAt).getTime()}`
								: "default_conversation";

						if (owner?.userId && input && userId) {
							const existing = await prisma.conversationAgent.findUnique({
								where: { conversationId },
								select: { agentId: true },
							});

							if (existing?.agentId) {
								const { buildAgentFromDB } = await import("../agents/factory");
								const agentInstance = await buildAgentFromDB(existing.agentId);
								const result = await agentInstance.generateText(input, {
									userId,
									conversationId,
								});
								const reply = getReply(result);
								if (reply) {
									// persist outgoing message for dashboard visibility
									try {
										await prisma.messages.create({
											data: {
												instance,
												remoteJid: userId,
												fromMe: true,
												message: reply,
												sendAt: new Date(),
											},
										});
									} catch (persistErr) {
										console.error("persist outgoing error", persistErr);
									}
									replies.push({ remoteJid: userId, reply, conversationId });
								}
							} else {
								const primary = await prisma.agentChannel.findFirst({
									where: {
										channel: "WHATSAPP",
										primary: true,
										agent: { ownerId: owner.userId, status: "ATIVO" },
									},
									select: { agentId: true },
								});

								let agentId: string | null = null;
								let reply: string | undefined;
								if (primary?.agentId) {
									const { buildAgentFromDB } = await import(
										"../agents/factory"
									);
									const agentInstance = await buildAgentFromDB(primary.agentId);
									const result = await agentInstance.generateText(input, {
										userId,
										conversationId,
									});
									reply = getReply(result);
									agentId = primary.agentId;
								} else {
									const { SecretaryChat } = await import("../agents/secretary");
									const result = await SecretaryChat(
										input,
										userId,
										conversationId,
									);
									reply = (result as { reply?: string })?.reply;
									const sec = await prisma.agent.findFirst({
										where: {
											ownerId: owner.userId,
											tipo: AgentType.SECRETARIA,
										},
										select: { id: true },
									});
									agentId = sec?.id ?? null;
								}

								if (reply) {
									// persist outgoing message for dashboard visibility
									try {
										await prisma.messages.create({
											data: {
												instance,
												remoteJid: userId,
												fromMe: true,
												message: reply,
												sendAt: new Date(),
											},
										});
									} catch (persistErr) {
										console.error("persist outgoing error", persistErr);
									}
									replies.push({ remoteJid: userId, reply, conversationId });
								}

								if (agentId) {
									await prisma.conversationAgent.upsert({
										where: { conversationId },
										update: { agentId },
										create: { conversationId, agentId },
									});
								}
							}
						}
					}
				} catch (routeErr) {
					console.error("routing error", routeErr);
				}

				return c.json({ success: true, data: { count: saved.length, replies } }, 201);
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
			const limit = Math.min(
				Number.parseInt(c.req.query("limit") || "20", 10),
				100,
			);
			const offset = Math.max(
				Number.parseInt(c.req.query("offset") || "0", 10),
				0,
			);

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

				const map = new Map<string, (typeof recent)[number]>();
				for (const m of recent) {
					if (!map.has(m.remoteJid || "")) map.set(m.remoteJid || "", m);
				}

				let rows = Array.from(map.values());
				if (q) {
					rows = rows.filter(
						(r) =>
							(r.pushName || "").toLowerCase().includes(q) ||
							(r.remoteJid || "").toLowerCase().includes(q),
					);
				}

				const page = rows.slice(offset, offset + limit);
				const data = page.map((r) => ({
					id: r.remoteJid,
					name: r.pushName || r.remoteJid,
					unreadCount: 0, // no read-state tracking yet
					lastMessage: { body: r.message, timestamp: r.sendAt },
				}));

				// Return plain array to match frontend expectations; include total in header
				c.header("X-Total-Count", String(rows.length));
				return c.json(data, 200);
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
			const limit = Math.min(
				Number.parseInt(c.req.query("limit") || "50", 10),
				200,
			);
			const offset = Math.max(
				Number.parseInt(c.req.query("offset") || "0", 10),
				0,
			);
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

	// Simple test endpoint: send a message and receive AI reply (no Evolution call)
	{
		path: "/instances/:instance/ai-reply",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const instance = c.req.param("instance");
			// biome-ignore lint/suspicious/noExplicitAny: flexible input
			const body = (await c.req.json().catch(() => ({}))) as any;
			const remoteJid = String(
				body.remoteJid || body.jid || body.to || body.number || body.chatId || "",
			).trim();
			const text = String(body.message || body.text || body.body || "").trim();
			const messageId = body.messageId ? String(body.messageId) : undefined;
			const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
			if (!remoteJid || !text)
				return c.json({ success: false, message: "missing remoteJid or message" }, 400);

			try {
				await ensureInstanceAccess(c, instance);
				// persist inbound
				await saveMessage({
					instance,
					remoteJid,
					fromMe: false,
					messageId,
					body: text,
					timestamp,
				});

				const sendAt = timestamp;
				const conversationId = messageId
					? `${messageId}_${new Date(sendAt).getTime()}`
					: "default_conversation";

				// route to existing agent or primary WHATSAPP; fallback secretary
				const existing = await prisma.conversationAgent.findUnique({
					where: { conversationId },
					select: { agentId: true },
				});

				let reply: string | undefined;
				let agentId: string | null = null;
				if (existing?.agentId) {
					const { buildAgentFromDB } = await import("../agents/factory");
					const agentInstance = await buildAgentFromDB(existing.agentId);
					const result = await agentInstance.generateText(text, {
						userId: remoteJid,
						conversationId,
					});
					reply = (result as { reply?: string })?.reply;
					agentId = existing.agentId;
				} else {
					const owner = await prisma.whatsappNumbers.findFirst({
						where: { instance },
						select: { userId: true },
					});
					const primary = owner?.userId
						? await prisma.agentChannel.findFirst({
								where: {
									channel: "WHATSAPP",
									primary: true,
									agent: { ownerId: owner.userId, status: "ATIVO" },
								},
								select: { agentId: true },
							})
						: null;

					if (primary?.agentId) {
						const { buildAgentFromDB } = await import("../agents/factory");
						const agentInstance = await buildAgentFromDB(primary.agentId);
						const result = await agentInstance.generateText(text, {
							userId: remoteJid,
							conversationId,
						});
						reply = (result as { reply?: string })?.reply;
						agentId = primary.agentId;
					} else {
						const { SecretaryChat } = await import("../agents/secretary");
						const result = await SecretaryChat(text, remoteJid, conversationId);
						reply = (result as { reply?: string })?.reply;
						const sec = owner?.userId
							? await prisma.agent.findFirst({
									where: { ownerId: owner.userId, tipo: AgentType.SECRETARIA },
									select: { id: true },
								})
							: null;
						agentId = sec?.id ?? null;
					}
				}

				if (agentId) {
					await prisma.conversationAgent.upsert({
						where: { conversationId },
						update: { agentId },
						create: { conversationId, agentId },
					});
				}

				if (reply) {
					await saveMessage({
						instance,
						remoteJid,
						fromMe: true,
						body: reply,
						timestamp: Date.now(),
					});
				}

				return c.json(
					{ success: true, data: { reply: reply ?? "", conversationId } },
					200,
				);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "error";
				return c.json({ success: false, message }, 400);
			}
		},
		description: "[auth] Test endpoint: receive text and return AI reply",
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
				return c.json(
					{
						success: true,
						data: { jid, name: m?.pushName, pushName: m?.pushName },
					},
					200,
				);
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
			// biome-ignore lint/suspicious/noExplicitAny: unknown body shape
			const body = await c.req.json().catch(() => ({}) as any);
			const dest = String(
				body.number ||
					body.to ||
					body.jid ||
					body.remoteJid ||
					body.chatId ||
					"",
			).trim();
			const msg = String(body.text || body.message || body.body || "").trim();
			if (!dest || !msg) {
				return c.json({ success: false, message: "missing to or text" }, 400);
			}
			try {
				await ensureInstanceAccess(c, instance);
				// Persist locally; frontend is responsible for delivering to Evolution
				await saveMessage({
					instance,
					remoteJid: dest,
					fromMe: true,
					messageId: body.messageId || undefined,
					body: msg,
					timestamp: Date.now(),
				});
				return c.json({ success: true, data: { deliveredBy: "frontend", to: dest } }, 200);
			} catch (e: unknown) {
				console.error("send error", e);
				return c.json({ success: false, message: "internal error" }, 500);
			}
		},
		description: "[auth] Send text via Evolution and persist",
	},
];
