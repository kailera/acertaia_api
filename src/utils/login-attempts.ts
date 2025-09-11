import { appendFile } from "node:fs/promises";

export async function logFailedLoginAttempt(
	ip: string,
	userAgent: string,
	email?: string,
): Promise<void> {
	const line = `${new Date().toISOString()} ip=${ip} ua=${userAgent} email=${
		email ?? "unknown"
	}\n`;
	try {
		await appendFile("failed-login-attempts.log", line);
	} catch (err) {
		console.error("Failed to log login attempt", err);
	}
}
