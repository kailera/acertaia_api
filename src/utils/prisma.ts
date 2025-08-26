import prismaPkg from "@prisma/client";

export const { PrismaClient, DocKind } = prismaPkg;
export const prisma = new PrismaClient();
