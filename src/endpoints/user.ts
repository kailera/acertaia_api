import { Role } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import { hash } from "bcryptjs";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { loginUser } from "../services/login";
import { createInstance, createUser } from "../services/users";
import { logFailedLoginAttempt } from "../utils/login-attempts";

const loginRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (c) =>
    c.req.header("x-forwarded-for") ||
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    "unknown",
});

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
            400
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
          201
        );
      } catch (error: unknown) {
        return c.json(
          {
            success: false,
            message:
              error instanceof Error ? error.message : "Invalid request body",
            data: null,
          },
          400
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
            400
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
            401
          );
        }

        return c.json(
          {
            success: true,
            message: "Login successful",
            data: { token: result.token },
          },
          200
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
          400
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
            400
          );
        const createdInstance = await createInstance(instance, userId);

        console.log("user encontrado:", instance);
        return c.json(
          {
            success: true,
            message: "instance created successful",
            data: createdInstance,
          },
          201
        );
      } catch (error: unknown) {
        return c.json(
          {
            success: false,
            message:
              error instanceof Error ? error.message : "Invalid request body",
            data: null,
          },
          400
        );
      }
    },
    description: "[publica] cria uma instancia no banco",
  },
];
