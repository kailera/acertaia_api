import { Role } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import { hash } from "bcryptjs";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { loginUser } from "../services/login";
import { createInstance, createUser } from "../services/users";
import { getUserIdFromHeaders } from "../utils/auth";
import { logFailedLoginAttempt } from "../utils/login-attempts";
import { prisma } from "../utils/prisma";

const loginRateLimit = rateLimiter({
	windowMs: 60 * 1000,
	limit: 5,
	keyGenerator: (c) =>
		c.req.header("x-forwarded-for") ||
		c.req.header("cf-connecting-ip") ||
		c.req.header("x-real-ip") ||
		"unknown",
});

async function requireAuthHeaders(c: Context): Promise<string | Response> {
	const userId = await getUserIdFromHeaders(c);
	if (!userId)
		return c.json({ message: "missing or invalid Authorization header" }, 401);
	const tenantId = c.req.header("x-tenant-id") || c.req.header("X-Tenant-Id");
	if (!tenantId) return c.json({ message: "missing X-Tenant-Id header" }, 400);
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { tenantId: true },
	});
	if (!user || user.tenantId !== tenantId)
		return c.json({ message: "forbidden" }, 403);
	return tenantId;
}

export const userEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/users",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			try {
				const body = await c.req.json().catch(() => null);
				if (!body || typeof body !== "object")
					return c.json({ success: false, message: "Invalid JSON body" }, 400);

				const { name, email, password, tenantId, role } = body as {
					name?: string;
					email?: string;
					password?: string;
					tenantId?: string;
					role?: Role;
				};

				if (!name || !email || !password || !tenantId)
					return c.json(
						{
							success: false,
							message: "name, email, password and tenantId are required",
						},
						400,
					);

				const passwordHash = await hash(password, 10);
				const createdUser = await createUser({
					name,
					email,
					passwordHash,
					role: role ?? Role.USER,
					tenantId,
				});

				return c.json(
					{
						success: true,
						message: "user created",
						data: { id: createdUser.id },
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
		description: "[publica] cria usuário",
	},
	{
		path: "/api/login",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			// Run rate limiter first
			const rateLimitResult = await loginRateLimit(c, async () => {});
			if (rateLimitResult) return rateLimitResult;

			const ip =
				c.req.header("x-forwarded-for") ||
				c.req.header("cf-connecting-ip") ||
				c.req.header("x-real-ip") ||
				"unknown";
			const userAgent = c.req.header("user-agent") || "unknown";
			const registerFailure = async (email?: string) =>
				logFailedLoginAttempt(ip, userAgent, email);
			try {
				const body = await c.req.json().catch(() => null);
				if (!body || typeof body !== "object") {
					await registerFailure();
					return c.json({ success: false, message: "Invalid JSON body" }, 400);
				}
				const { email, password } = body as {
					email?: string;
					password?: string;
				};
				if (!email || !password) {
					await registerFailure(email);
					return c.json(
						{ success: false, message: "email and password are required" },
						400,
					);
				}
				const result = await loginUser(email, password);
				if (!result.success) {
					await registerFailure(email);
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
				await registerFailure();
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
	{
		path: "/api/users",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const tenantId = await requireAuthHeaders(c);
			if (tenantId instanceof Response) return tenantId;
			const roleParam = c.req.query("role");
			const teamId = c.req.query("teamId");
			const where: Record<string, unknown> = { tenantId };
			if (roleParam) {
				if (!Object.values(Role).includes(roleParam as Role))
					return c.json({ success: false, message: "invalid role" }, 400);
				where.role = roleParam as Role;
			}
			if (teamId) {
				where.aiAgents = { some: { teams: { some: { teamId } } } };
			}
			const users = await prisma.user.findMany({
				where,
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					tenantId: true,
				},
			});
			return c.json({ success: true, data: users }, 200);
		},
		description: "[privada] lista usuários",
	},
	{
		path: "/api/users/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const tenantId = await requireAuthHeaders(c);
			if (tenantId instanceof Response) return tenantId;
			const id = c.req.param("id");
			const user = await prisma.user.findFirst({
				where: { id, tenantId },
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					tenantId: true,
				},
			});
			if (!user)
				return c.json({ success: false, message: "user not found" }, 404);
			return c.json({ success: true, data: user }, 200);
		},
		description: "[privada] busca usuário por id",
	},
	{
		path: "/api/users/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const tenantId = await requireAuthHeaders(c);
			if (tenantId instanceof Response) return tenantId;
			const id = c.req.param("id");
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object")
				return c.json({ success: false, message: "Invalid JSON body" }, 400);
			const { name, email, role } = body as {
				name?: string;
				email?: string;
				role?: Role;
			};
			const data: Record<string, unknown> = {};
			if (name) data.name = name;
			if (email) data.email = email;
			if (role) data.role = role;
			if (Object.keys(data).length === 0)
				return c.json({ success: false, message: "No fields to update" }, 400);
			const existing = await prisma.user.findFirst({
				where: { id, tenantId },
				select: { id: true },
			});
			if (!existing)
				return c.json({ success: false, message: "user not found" }, 404);
			const updated = await prisma.user.update({
				where: { id },
				data,
			});
			return c.json(
				{
					success: true,
					message: "user updated",
					data: { id: updated.id },
				},
				200,
			);
		},
		description: "[privada] atualiza usuário",
	},
	{
		path: "/api/users/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const tenantId = await requireAuthHeaders(c);
			if (tenantId instanceof Response) return tenantId;
			const id = c.req.param("id");
			const existing = await prisma.user.findFirst({
				where: { id, tenantId },
				select: { id: true },
			});
			if (!existing)
				return c.json({ success: false, message: "user not found" }, 404);
			await prisma.user.delete({ where: { id } });
			return c.json({ success: true, message: "user deleted" }, 200);
		},
		description: "[privada] remove usuário",
	},
];
