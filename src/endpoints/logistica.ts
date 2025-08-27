import type { CustomEndpointDefinition } from "@voltagent/core";
import { LogisticaChat } from "../agents/logistica";

export const logisticaEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/logistica/chat",
		method: "post" as const,
		handler: async (
			// biome-ignore lint/suspicious/noExplicitAny: framework context is untyped
			c: any,
		) => {
			const body = await c.req.json();
			const { input, userId, conversationId } = body;

			try {
				const response = await LogisticaChat(input, userId, conversationId);
				return c.json(
					{
						success: true,
						message: "message successfull",
						data: response,
					},
					201,
				);
			} catch (
				// biome-ignore lint/suspicious/noExplicitAny: unknown error shape
				error: any
			) {
				return c.json(
					{
						success: false,
						message: error.message || "Invalid request body",
						data: null,
					},
					400,
				);
			}
		},
		description: "[publica] chat com logistica",
	},
];
