import { randomUUID } from "node:crypto";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { SDRChat } from "../agents/sdr";
import { ok } from "../utils/response";

export const srdEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/sdr",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const body = await c.req.json();
			const { input, userId, conversationId } = body;
			const convId =
				conversationId && conversationId.length > 0
					? conversationId
					: randomUUID();

			// pegue os dados do a
			try {
				const response = await SDRChat(input, userId, convId);
				return c.json(
					ok({
						success: true,
						message: "message successfull",
						data: { ...response, conversationId: convId },
					}),
					201,
				);
			} catch (error: unknown) {
				return c.json(
					ok({
						success: false,
						message:
							error instanceof Error ? error.message : "Invalid request body",
						data: null,
					}),
					400,
				);
			}
		},
		description: "[publica] busca email para login",
	},
];
