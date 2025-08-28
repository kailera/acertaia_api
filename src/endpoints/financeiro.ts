import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { FinanceiroChat } from "../agents/financeiro";
import { randomUUID } from "node:crypto";

export const financeiroEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/financeiro/chat",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const body = await c.req.json();
			const { input, userId, conversationId } = body;
			const convId = conversationId && conversationId.length > 0 ? conversationId : randomUUID();

			try {
				const response = await FinanceiroChat(input, userId, convId);
				return c.json(
					{
						success: true,
						message: "message successfull",
						data: { ...response, conversationId: convId },
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
		description: "[publica] chat com financeiro",
	},
];
