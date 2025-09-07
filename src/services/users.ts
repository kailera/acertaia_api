import { prisma } from "../utils/prisma";

export async function createInstance(instance: string, userId: string) {
  // Idempotente: 1 registro por usuário. Se existir, atualiza a instance.
  const row = await prisma.whatsappNumbers.upsert({
    where: { userId },
    update: { instance },
    create: { userId, instance },
  });
  return row;
}
