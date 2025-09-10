import { SignJWT } from "jose";
import { getUserbyEmail } from "../repositories/user-repository";
import { verifyPassword } from "../utils/password";

interface LoginResult {
	success: boolean;
	user?: Awaited<ReturnType<typeof getUserbyEmail>>;
	token?: string;
}

export const loginUser = async (
	email: string,
	password: string,
): Promise<LoginResult> => {
	const queryUser = await getUserbyEmail(email);
	if (!queryUser) return { success: false };

	const passwordMatch = await verifyPassword(password, queryUser.passwordHash);
	if (!passwordMatch) {
		return { success: false };
	}

	const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
	const token = await new SignJWT({ userId: queryUser.id })
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("1h")
		.sign(secret);

	return { success: true, user: queryUser, token };
};
