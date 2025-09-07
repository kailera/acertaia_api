import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { SecretaryChat } from "../agents/secretary";
import { prisma } from "../utils/prisma";

type ParsedMessage = {
	remoteJid: string | undefined;
	message: string;
	sentAt: Date;
	messageId: string | undefined;
	fromMe: boolean | undefined;
	pushName: string;
	instance: string | undefined;
};

export const whatsappEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/message-upsert",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const body = await c.req.json().catch(() => ({}));
			const { parsedMessages } = body as { parsedMessages: ParsedMessage[] };
			// salvar a mensagem no banco de dados
			try {
				const savedMessages = await Promise.all(
					parsedMessages.map((message) =>
						prisma.messages.create({
							data: {
								remoteJid: message.remoteJid || "numero desconhecido",
								message: message.message,
								sendAt: message.sentAt,
								messageId: message.messageId,
								fromMe: message.fromMe,
								pushName: message.pushName,
								instance: message.instance || "indefinida",
							},
						}),
					),
				);

				// envie para a secretária as mensagens. o user id é o remote JID e o conversationId é a a concatenação entre a messageId junto do sendAt. Input são as mensagens salvas no savedMessages separadas por ponto.
				const input = savedMessages.map((m) => m.message).join(". ");
				const userId = savedMessages[0]?.remoteJid;
				const conversationId =
					savedMessages[0]?.messageId && savedMessages[0]?.sendAt
						? `${
								savedMessages[0].messageId
							}_${savedMessages[0].sendAt.getTime()}`
						: "default_conversation";

				if (!userId) {
					throw new Error("UserId não encontrado nas mensagens salvas");
				}
				// Envia para a secretária
				const response = await SecretaryChat(input, userId, conversationId);

				return c.json(
					{
						success: true,
						message: "message successfull",
						data: response,
					},
					201,
				);
			} catch (error: unknown) {
				return c.json(
					{
						success: false,
						message:
							error instanceof Error ? error.message : "Invalid request body",
						data: null,
					},
					400,
				);
			}
		},
		description: "[publica] chat com secretária",
	},
];
