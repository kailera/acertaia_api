import type { InternalActionType, Prisma } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

async function requireAuthHeaders(
        c: Context,
): Promise<{ tenantId: string } | Response> {
        const userId = await getUserIdFromHeaders(c);
        if (!userId) {
                return c.json({ message: "missing or invalid Authorization header" }, 401);
        }
        const tenantId = c.req.header("x-tenant-id") || c.req.header("X-Tenant-Id");
        if (!tenantId) {
                return c.json({ message: "missing X-Tenant-Id header" }, 400);
        }
        const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { tenantId: true },
        });
        if (!user || user.tenantId !== tenantId) {
                return c.json({ message: "forbidden" }, 403);
        }
        return { tenantId };
}

export const endoActionEndpoints: CustomEndpointDefinition[] = [
        {
                path: "/api/endo/actions",
                method: "get" as const,
                handler: async (c: Context): Promise<Response> => {
                        const auth = await requireAuthHeaders(c);
                        if (auth instanceof Response) return auth;

                        const tipo = c.req.query("tipo");
                        const iniciaFrom = c.req.query("iniciaFrom");
                        const iniciaTo = c.req.query("iniciaTo");
                        const terminaFrom = c.req.query("terminaFrom");
                        const terminaTo = c.req.query("terminaTo");

                        const where: Prisma.InternalActionWhereInput = {
                                tenantId: auth.tenantId,
                        };

                        if (tipo) where.tipo = tipo as InternalActionType;

                        if (iniciaFrom || iniciaTo) {
                                where.iniciaEm = {};
                                if (iniciaFrom) {
                                        const date = new Date(iniciaFrom);
                                        if (!Number.isNaN(date.getTime())) where.iniciaEm.gte = date;
                                }
                                if (iniciaTo) {
                                        const date = new Date(iniciaTo);
                                        if (!Number.isNaN(date.getTime())) where.iniciaEm.lte = date;
                                }
                        }

                        if (terminaFrom || terminaTo) {
                                where.terminaEm = {};
                                if (terminaFrom) {
                                        const date = new Date(terminaFrom);
                                        if (!Number.isNaN(date.getTime())) where.terminaEm.gte = date;
                                }
                                if (terminaTo) {
                                        const date = new Date(terminaTo);
                                        if (!Number.isNaN(date.getTime())) where.terminaEm.lte = date;
                                }
                        }

                        const actions = await prisma.internalAction.findMany({
                                where,
                                orderBy: { createdAt: "desc" },
                        });
                        return c.json(actions);
                },
                description: "[privada] lista ações internas",
        },
        {
                path: "/api/endo/actions",
                method: "post" as const,
                handler: async (c: Context): Promise<Response> => {
                        const auth = await requireAuthHeaders(c);
                        if (auth instanceof Response) return auth;

                        const body = await c.req.json().catch(() => null);
                        if (!body || typeof body !== "object") {
                                return c.json({ message: "invalid request body" }, 400);
                        }

                        const { tipo, titulo, conteudo, iniciaEm, terminaEm, publico } = body as {
                                tipo?: string;
                                titulo?: string;
                                conteudo?: string;
                                iniciaEm?: string;
                                terminaEm?: string;
                                publico?: string;
                        };

                        if (!tipo || !titulo || !conteudo) {
                                return c.json(
                                        { message: "tipo, titulo e conteudo são obrigatórios" },
                                        400,
                                );
                        }

                        const data: Prisma.InternalActionUncheckedCreateInput = {
                                tenantId: auth.tenantId,
                                tipo: tipo as InternalActionType,
                                titulo,
                                conteudo,
                                iniciaEm: iniciaEm ? new Date(iniciaEm) : undefined,
                                terminaEm: terminaEm ? new Date(terminaEm) : undefined,
                                publico: publico ?? null,
                        };

                        const created = await prisma.internalAction.create({ data });
                        return c.json(created, 201);
                },
                description: "[privada] cria ação interna",
        },
        {
                path: "/api/endo/actions/:id",
                method: "get" as const,
                handler: async (c: Context): Promise<Response> => {
                        const auth = await requireAuthHeaders(c);
                        if (auth instanceof Response) return auth;

                        const id = c.req.param("id");
                        const action = await prisma.internalAction.findFirst({
                                where: { id, tenantId: auth.tenantId },
                        });
                        if (!action) return c.json({ message: "not found" }, 404);
                        return c.json(action);
                },
                description: "[privada] obtém ação interna",
        },
        {
                path: "/api/endo/actions/:id",
                method: "patch" as const,
                handler: async (c: Context): Promise<Response> => {
                        const auth = await requireAuthHeaders(c);
                        if (auth instanceof Response) return auth;

                        const id = c.req.param("id");
                        const existing = await prisma.internalAction.findFirst({
                                where: { id, tenantId: auth.tenantId },
                        });
                        if (!existing) return c.json({ message: "not found" }, 404);

                        const body = await c.req.json().catch(() => null);
                        if (!body || typeof body !== "object") {
                                return c.json({ message: "invalid request body" }, 400);
                        }

                        const { tipo, titulo, conteudo, iniciaEm, terminaEm, publico } = body as {
                                tipo?: string;
                                titulo?: string;
                                conteudo?: string;
                                iniciaEm?: string;
                                terminaEm?: string;
                                publico?: string;
                        };

                        const data: Prisma.InternalActionUncheckedUpdateInput = {};
                        if (tipo !== undefined) data.tipo = tipo as InternalActionType;
                        if (titulo !== undefined) data.titulo = titulo;
                        if (conteudo !== undefined) data.conteudo = conteudo;
                        if (iniciaEm !== undefined) {
                                const date = new Date(iniciaEm);
                                if (!Number.isNaN(date.getTime())) data.iniciaEm = date;
                        }
                        if (terminaEm !== undefined) {
                                const date = new Date(terminaEm);
                                if (!Number.isNaN(date.getTime())) data.terminaEm = date;
                        }
                        if (publico !== undefined) data.publico = publico;

                        const updated = await prisma.internalAction.update({
                                where: { id },
                                data,
                        });
                        return c.json(updated);
                },
                description: "[privada] atualiza ação interna",
        },
        {
                path: "/api/endo/actions/:id",
                method: "delete" as const,
                handler: async (c: Context): Promise<Response> => {
                        const auth = await requireAuthHeaders(c);
                        if (auth instanceof Response) return auth;

                        const id = c.req.param("id");
                        const existing = await prisma.internalAction.findFirst({
                                where: { id, tenantId: auth.tenantId },
                        });
                        if (!existing) return c.json({ message: "not found" }, 404);

                        await prisma.internalAction.delete({ where: { id } });
                        return c.json({ success: true });
                },
                description: "[privada] remove ação interna",
        },
];

export default endoActionEndpoints;
