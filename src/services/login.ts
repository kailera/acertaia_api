import { getUserbyEmail } from "../repositories/user-repository";
import { verifyPassword } from "../utils/password";

export const loginUser = async (email: string, password: string) => {
	const queryUser = await getUserbyEmail(email);
	if (!queryUser) return { sucess: false };

	const passwordMatch = await verifyPassword(password, queryUser.passwordHash);
	if (!passwordMatch) {
		return null;
	}
	// password passado
	return queryUser;
};
