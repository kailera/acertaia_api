import type { Context } from "hono";
import { prisma } from "./prisma";

// Ensures the `instance` belongs to the user from header x-user-id
export async function ensureInstanceAccess(c: Context, instance: string) {
  const userId = c.req.header("x-user-id");
  if (!userId) throw new Error("missing x-user-id header");

  const ownership = await prisma.whatsappNumbers.findFirst({
    where: { userId, instance },
    select: { id: true, instance: true },
  });
  if (!ownership) throw new Error("instance not allowed for this user");
  return { userId, evoInstance: ownership.instance };
}
