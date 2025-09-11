import { prisma } from "../utils/prisma";

export const getTeamsByTenant = async (tenantId: string) => {
	return await prisma.team.findMany({
		where: { tenantId },
		include: {
			membros: {
				orderBy: { pos: "asc" },
				select: { agentId: true, pos: true },
			},
			regras: true,
		},
	});
};
