import { prisma } from "../utils/prisma";

interface UserInterface {
  id?: string;
  name?: string;
  email?: string;
  businessSubscription?: string;
  passwordHash?: string;
  role?: string;
}

export const getUserbyEmail = async (email: string) => {
  return await prisma.user.findFirst({
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
