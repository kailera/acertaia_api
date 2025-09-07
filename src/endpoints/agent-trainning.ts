import { $Enums } from "@prisma/client";
import type { CustomEndpointDefinition } from "@voltagent/core";
import type { Context } from "hono";
import { startAgentTraining } from "../services/agent-trainning";
import { prisma } from "../utils/prisma";

export const agentTrainEndpoints: CustomEndpointDefinition[] = [
	{
		path: "/api/agents/:id/train",
		method: "post" as const,
		handler: async (c: Context): Promise<Response> => {
			const userId = c.req.header("x-user-id");
			if (!userId)
				return c.json({ success: false, message: "missing userId" }, 401);
			const id = c.req.param("id");

			console.info(`[train] request received: agentId=${id} userId=${userId}`);

			const agent = await prisma.agent.findUnique({ where: { id } });
			if (!agent)
				return c.json({ success: false, message: "agent not found" }, 404);
			if (agent.ownerId !== userId)
				return c.json({ success: false, message: "forbidden" }, 403);

			const job = await prisma.trainingJob.create({
				data: { agentId: id, status: "PENDING" },
			});

			console.info(`[train] job queued: jobId=${job.id} agentId=${id}`);

			startAgentTraining(job.id).catch(async (err: unknown) => {
				console.error(`[train] job failed: jobId=${job.id}`, err);
				await prisma.trainingJob.update({
					where: { id: job.id },
					data: {
						status: $Enums.JobStatus.ERROR,
						error: String(err).slice(0, 2000),
					},
				});
			});

			return c.json({ success: true, jobId: job.id });
		},
	},
	{
		path: "/api/agents/:id/train/status",
		method: "get" as const,
		handler: async (c: Context): Promise<Response> => {
			const id = c.req.param("id");
			const job = await prisma.trainingJob.findFirst({
				where: { agentId: id },
				orderBy: { createdAt: "desc" },
			});
			return c.json({ success: true, job });
		},
	},
];
