import type { CampaignStatus, Channel, Prisma } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { getUserIdFromHeaders } from "../utils/auth";
import { prisma } from "../utils/prisma";

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

export const campaignEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/campaigns",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const channel = c.req.query("channel") || undefined;
			const status = c.req.query("status") || undefined;
			const startFrom = c.req.query("startFrom");
			const startTo = c.req.query("startTo");

			const where: Prisma.CampaignWhereInput = {
				tenantId: auth.tenantId,
			} as unknown as Prisma.CampaignWhereInput;

			if (channel)
				(where as unknown as { channel: Channel }).channel = channel as Channel;
			if (status)
				(where as unknown as { status: CampaignStatus }).status =
					status as CampaignStatus;
			if (startFrom || startTo) {
				where.startDate = {};
				if (startFrom) where.startDate.gte = new Date(startFrom);
				if (startTo) where.startDate.lte = new Date(startTo);
			}
			const campaigns = await prisma.campaign.findMany({ where });
			return c.json(campaigns);
		},
		description: "[privada] lista campanhas",
	},
	{
		path: "/api/campaigns",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { name, channel, startDate, origin, endDate, description, status } =
				body as {
					name?: string;
					channel?: string;
					startDate?: string;
					origin?: string;
					endDate?: string;
					description?: string;
					status?: string;
				};
			if (!name || !channel || !startDate) {
				return c.json(
					{ message: "name, channel and startDate are required" },
					400,
				);
			}
			const data: Prisma.CampaignCreateInput = {
				name,
				channel: channel as Channel,
				startDate: new Date(startDate),
				tenantId: auth.tenantId,
			} as unknown as Prisma.CampaignCreateInput;
			if (origin !== undefined)
				(data as unknown as { origin: string | undefined }).origin = origin;
			if (endDate !== undefined)
				(data as unknown as { endDate: Date | undefined }).endDate = endDate
					? new Date(endDate)
					: undefined;
			if (description !== undefined)
				(data as unknown as { description: string | undefined }).description =
					description;
			if (status !== undefined)
				(data as unknown as { status: CampaignStatus | undefined }).status =
					status as CampaignStatus;
			const created = await prisma.campaign.create({ data });
			return c.json(created, 201);
		},
		description: "[privada] cria campanha",
	},
	{
		path: "/api/campaigns/:id",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const campaign = await prisma.campaign.findFirst({
				where: { id, tenantId: auth.tenantId },
			});
			if (!campaign) return c.json({ message: "not found" }, 404);
			return c.json(campaign);
		},
		description: "[privada] busca campanha por id",
	},
	{
		path: "/api/campaigns/:id",
		method: "patch" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.campaign.findUnique({
				where: { id },
				select: { tenantId: true },
			});
			if (!existing || existing.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}
			const body = await c.req.json().catch(() => null);
			if (!body || typeof body !== "object") {
				return c.json({ message: "invalid request body" }, 400);
			}
			const { name, channel, startDate, origin, endDate, description, status } =
				body as {
					name?: string;
					channel?: string;
					startDate?: string;
					origin?: string;
					endDate?: string;
					description?: string;
					status?: string;
				};
			const data: Prisma.CampaignUpdateInput =
				{} as unknown as Prisma.CampaignUpdateInput;
			if (name !== undefined) data.name = name;
			if (channel !== undefined)
				(data as unknown as { channel: Channel }).channel = channel as Channel;
			if (startDate !== undefined)
				(data as unknown as { startDate: Date }).startDate = new Date(
					startDate,
				);
			if (origin !== undefined)
				(data as unknown as { origin: string | undefined }).origin = origin;
			if (endDate !== undefined)
				(data as unknown as { endDate: Date | undefined }).endDate = endDate
					? new Date(endDate)
					: undefined;
			if (description !== undefined)
				(data as unknown as { description: string | undefined }).description =
					description;
			if (status !== undefined)
				(data as unknown as { status: CampaignStatus }).status =
					status as CampaignStatus;
			if (Object.keys(data as object).length === 0) {
				return c.json({ message: "no fields to update" }, 400);
			}
			const updated = await prisma.campaign.update({ where: { id }, data });
			return c.json(updated);
		},
		description: "[privada] atualiza campanha",
	},
	{
		path: "/api/campaigns/:id",
		method: "delete" as const,
		handler: async (c: Context): Promise<Response> => {
			const auth = await requireAuthHeaders(c);
			if (auth instanceof Response) return auth;
			const id = c.req.param("id");
			const existing = await prisma.campaign.findUnique({
				where: { id },
				select: { tenantId: true },
			});
			if (!existing || existing.tenantId !== auth.tenantId) {
				return c.json({ message: "not found" }, 404);
			}
			await prisma.campaign.delete({ where: { id } });
			return c.json({ success: true });
		},
		description: "[privada] remove campanha",
	},
];
