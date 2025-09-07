import type { Context } from "hono";
import { prisma } from "./prisma";

// Attempt to resolve user from headers: prefer x-user-id; fallback to Authorization (Bearer <userId> or <userId>)
export function getUserIdFromHeaders(c: Context): string | null {
  const direct = c.req.header("x-user-id");
  if (direct && direct.trim().length > 0) return direct.trim();
  const auth = c.req.header("authorization") || c.req.header("Authorization");
  if (!auth) return null;
  const val = auth.trim();
  if (!val) return null;
  const bearer = /^Bearer\s+(.+)$/i.exec(val);
  if (bearer && bearer[1]) return bearer[1].trim();
  return val; // last resort: treat whole header as userId
}

// Ensures the `instance` belongs to the user obtained from headers
export async function ensureInstanceAccess(c: Context, instance: string) {
  const userId = getUserIdFromHeaders(c);
  if (!userId) throw new Error("missing user credentials");

  const ownership = await prisma.whatsappNumbers.findFirst({
    where: { userId, instance },
    select: { id: true, instance: true },
  });
  if (!ownership) throw new Error("instance not allowed for this user");
  return { userId, evoInstance: ownership.instance };
}
