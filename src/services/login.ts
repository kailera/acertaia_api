import { getUserbyEmail } from "../repositories/user-repository";
import { verifyPassword } from "../utils/password";

interface LoginResult{
	success:boolean;
	user?: Awaited<ReturnType<typeof getUserbyEmail>>;
}


export const loginUser = async (email: string, password: string):Promise<LoginResult> => {
	
	const queryUser = await getUserbyEmail(email);
	if (!queryUser) return { success: false };

	const passwordMatch = await verifyPassword(password, queryUser.passwordHash);
	if (!passwordMatch) {
		return {success:false};
	}
	// password passado
	return {success:true, user:queryUser}
};
