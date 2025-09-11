import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { prisma } from "../utils/prisma";
import { ok } from "../utils/response";

async function requireAuthHeaders(c: Context): Promise<string | Response> {
  const auth = c.req.header("authorization") || c.req.header("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return c.json({ message: "missing or invalid Authorization header" }, 401);
  }
  const tenantId = c.req.header("x-tenant-id") || c.req.header("X-Tenant-Id");
  if (!tenantId) {
    return c.json({ message: "missing X-Tenant-Id header" }, 400);
  }
  return tenantId;
}

export const tenantEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/api/tenants",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const tenantId = await requireAuthHeaders(c);
      if (tenantId instanceof Response) return tenantId;
      const tenants = await prisma.tenant.findMany();
      return c.json(ok(tenants));
    },
    description: "[privada] lista tenants",
  },
  {
    path: "/api/tenants",
    method: "post" as const,
    handler: async (c: Context): Promise<Response> => {
      const tenantId = await requireAuthHeaders(c);
      if (tenantId instanceof Response) return tenantId;
      const body = await c.req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return c.json({ message: "invalid request body" }, 400);
      }
      const { name, slug } = body as { name?: string; slug?: string };
      if (!name || !slug) {
        return c.json({ message: "name and slug are required" }, 400);
      }
      const created = await prisma.tenant.create({ data: { name, slug } });
      return c.json(ok(created), 201);
    },
    description: "[privada] cria tenant",
  },
  {
    path: "/api/tenants/:id",
    method: "get" as const,
    handler: async (c: Context): Promise<Response> => {
      const tenantId = await requireAuthHeaders(c);
      if (tenantId instanceof Response) return tenantId;
      const id = c.req.param("id");
      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) return c.json({ message: "not found" }, 404);
      return c.json(ok(tenant));
    },
    description: "[privada] busca tenant por id",
  },
  {
    path: "/api/tenants/:id",
    method: "patch" as const,
    handler: async (c: Context): Promise<Response> => {
      const tenantId = await requireAuthHeaders(c);
      if (tenantId instanceof Response) return tenantId;
      const id = c.req.param("id");
      const body = await c.req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return c.json({ message: "invalid request body" }, 400);
      }
      const { name, slug } = body as { name?: string; slug?: string };
      const data: Record<string, unknown> = {};
      if (name) data.name = name;
      if (slug) data.slug = slug;
      if (Object.keys(data).length === 0) {
        return c.json({ message: "no fields to update" }, 400);
      }
      try {
        const updated = await prisma.tenant.update({ where: { id }, data });
        return c.json(ok(updated));
      } catch {
        return c.json({ message: "not found" }, 404);
      }
    },
    description: "[privada] atualiza tenant",
  },
  {
    path: "/api/tenants/:id",
    method: "delete" as const,
    handler: async (c: Context): Promise<Response> => {
      const tenantId = await requireAuthHeaders(c);
      if (tenantId instanceof Response) return tenantId;
      const id = c.req.param("id");
      try {
        await prisma.tenant.delete({ where: { id } });
        return c.json(ok({ success: true }));
      } catch {
        return c.json({ message: "not found" }, 404);
      }
    },
    description: "[privada] remove tenant",
  },
];

