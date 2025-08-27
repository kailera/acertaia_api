import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { SDRChat } from "../agents/sdr";

export const srdEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/sdr",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const body = await c.req.json();
			const { input, userId, conversationId } = body;

			// pegue os dados do a
			try {
				const response = await SDRChat(input, userId, conversationId);
				return c.json(
					{
						success: true,
						message: "Login successful",
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
		description: "[publica] busca email para login",
	},
];
