import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { loginUser } from "../services/login";
import { createInstance } from "../services/users";

export const userEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/login",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			try {
				const body = await c.req.json().catch(() => null);
				if (!body || typeof body !== "object")
					return c.json({ success: false, message: "Invalid JSON body" }, 400);
				const { email, password } = body as {
					email?: string;
					password?: string;
				};
				if (!email || !password)
					return c.json(
						{ success: false, message: "email and password are required" },
						400,
					);
				const result = await loginUser(email, password);
				if (!result.success) {
					return c.json(
						{
							success: false,
							message: "Invalid Credentials",
						},
						401,
					);
				}

				return c.json(
					{
						success: true,
						message: "Login successful",
						data: { token: result.token },
					},
					200,
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

	{
		path: "/api/instance",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			try {
				const body = await c.req.json().catch(() => null);
				if (!body || typeof body !== "object")
					return c.json({ success: false, message: "Invalid JSON body" }, 400);
				const { instance, userId } = body as {
					instance?: string;
					userId?: string;
				};
				if (!instance || !userId)
					return c.json(
						{ success: false, message: "instance and userId are required" },
						400,
					);
				const createdInstance = await createInstance(instance, userId);

				console.log("user encontrado:", instance);
				return c.json(
					{
						success: true,
						message: "instance created successful",
						data: createdInstance,
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
		description: "[publica] cria uma instancia no banco",
	},
];
