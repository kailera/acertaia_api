import { randomUUID } from "node:crypto";
import { AgentType, Channel } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { z } from "zod";
import { buildAgentFromDB } from "../agents/factory";
import { SecretaryChat } from "../agents/secretary";
import { prisma } from "../utils/prisma";

const ChatPayload = z.object({
	input: z.string().min(1),
	userId: z.string().min(1),
	conversationId: z.string().optional(),
});

export const chatEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/chat",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const body = await c.req.json().catch(() => ({}));
			const parsed = ChatPayload.safeParse(body);
			if (!parsed.success)
				return c.json({ success: false, message: parsed.error.message }, 400);
			const { input, userId, conversationId } = parsed.data;
			const convId =
				conversationId && conversationId.length > 0
					? conversationId
					: randomUUID();

			try {
				const existing = await prisma.conversationAgent.findUnique({
					where: { conversationId: convId },
					select: { agentId: true },
				});

				let reply = "";
				if (existing?.agentId) {
					const agent = await buildAgentFromDB(existing.agentId);
					const result = (await agent.generateText(input, {
						userId,
						conversationId: convId,
					})) as unknown as { reply: string };
					reply = result.reply;
				} else {
					const mapping = await prisma.agentChannel.findFirst({
						where: {
							channel: Channel.WEB,
							primary: true,
							agent: { ownerId: userId, status: "ATIVO" },
						},
						select: { agentId: true },
					});

					let agentId: string | null = null;
					if (mapping?.agentId) {
						const agent = await buildAgentFromDB(mapping.agentId);
						const result = (await agent.generateText(input, {
							userId,
							conversationId: convId,
						})) as unknown as { reply: string };
						reply = result.reply;
						agentId = mapping.agentId;
					} else {
						const res = (await SecretaryChat(
							input,
							userId,
							convId,
						)) as unknown as {
							reply: string;
						};
						reply = res.reply;
						const sec = await prisma.agent.findFirst({
							where: { ownerId: userId, tipo: AgentType.SECRETARIA },
							select: { id: true },
						});
						agentId = sec?.id ?? null;
					}

					if (agentId) {
						await prisma.conversationAgent.upsert({
							where: { conversationId: convId },
							update: { agentId },
							create: { conversationId: convId, agentId },
						});
					}
				}

				return c.json(
					{ success: true, data: { reply, conversationId: convId } },
					201,
				);
			} catch (error: unknown) {
				return c.json(
					{
						success: false,
						message:
							error instanceof Error ? error.message : "Invalid request body",
					},
					400,
				);
			}
		},
		description: "[publica] chat com agentes ou secretária",
	},
];
