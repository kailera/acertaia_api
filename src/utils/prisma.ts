// src/utils/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // impede múltiplas instâncias durante hot reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export async function initPrisma() {
  try {
    await prisma.$connect(); // estabelece a conexão imediatamente
  } catch (err) {
    console.error("Falha ao conectar ao banco", err);
    throw err;
  }
}
