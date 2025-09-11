import type { Context } from "hono";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";

// Extract user id from Authorization: Bearer <token>
export async function getUserIdFromHeaders(c: Context): Promise<string | null> {
	const auth = c.req.header("authorization") || c.req.header("Authorization");
	if (!auth) return null;
	const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
	if (!match) return null;
	try {
		const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
		const { payload } = await jwtVerify(match[1], secret);
		const userId = payload.userId;
		return typeof userId === "string" ? userId : null;
	} catch {
		return null;
	}
}

// Ensure request has either a valid bearer token or an accepted x-api-key
export async function ensureApiKeyOrToken(c: Context) {
	const apiKey = c.req.header("x-api-key");
	const allowed = (process.env.API_KEYS || process.env.API_KEY || "")
		.split(",")
		.map((k) => k.trim())
		.filter(Boolean);
	if (apiKey && allowed.includes(apiKey)) return true;
	const userId = await getUserIdFromHeaders(c);
	if (userId) return true;
	throw new Error("invalid credentials");
}

// Ensures the `instance` belongs to the user obtained from headers
export async function ensureInstanceAccess(c: Context, instance: string) {
	const userId = await getUserIdFromHeaders(c);
	if (!userId) throw new Error("missing user credentials");

	const ownership = await prisma.whatsappNumbers.findFirst({
		where: { userId, instance },
		select: { id: true, instance: true },
	});
	if (!ownership) throw new Error("instance not allowed for this user");
	return { userId, evoInstance: ownership.instance };
}
