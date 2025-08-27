import { prisma } from "../utils/prisma";
import type { Prisma, WhatsappNumbers } from "@prisma/client";

export async function createInstance(
  instance: string,
  userId: string
): Promise<WhatsappNumbers> {
  // a instancia nao existe
  const data: Prisma.WhatsappNumbersCreateInput = {
    instance,
    user: { connect: { id: userId } },
  };
  const newInstance = await prisma.whatsappNumbers.create({ data });
  return newInstance;
}
