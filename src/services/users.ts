import type { Role } from "@prisma/client";
import { prisma } from "../utils/prisma";

export async function createUser({
	name,
	email,
	passwordHash,
	role,
	tenantId,
}: {
	name: string;
	email: string;
	passwordHash: string;
	role: Role;
	tenantId: string;
}) {
	return prisma.user.create({
		data: { name, email, passwordHash, role, tenantId },
	});
}

export async function createInstance(instance: string, userId: string) {
	// Idempotente: 1 registro por usuário. Se existir, atualiza a instance.
	const row = await prisma.whatsappNumbers.upsert({
		where: { userId },
		update: { instance },
		create: { userId, instance },
	});
	return row;
}
