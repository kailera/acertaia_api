import { prisma } from "../utils/prisma";
import type { User, WhatsappNumbers } from "@prisma/client";

export type UserWithWhatsapp = Pick<
  User,
  "id" | "name" | "email" | "passwordHash" | "role"
> & {
  whatsappNumbers: Pick<WhatsappNumbers, "instance" | "number"> | null;
};

export const getUserbyEmail = async (
  email: string
): Promise<UserWithWhatsapp | null> => {
  return prisma.user.findFirst({
    where: {
      email,
    },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      passwordHash: true,
      whatsappNumbers: {
        select: {
          instance: true,
          number: true,
        },
      },
    },
  });
};
