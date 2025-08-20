import { encrypt } from "../auth/auth";
import { getUserbyEmail } from "../repositories/user-repository";
import { verifyPassword } from "../utils/password";

export const loginUser = async (email: string, password: string) => {
  const queryUser = await getUserbyEmail(email);
  if (!queryUser) return { sucess: false };

  const passwordMatch = await verifyPassword(password, queryUser.passwordHash);
  if (!passwordMatch) {
    return null;
  }

  const token = encrypt({
    id: queryUser.id,
    name: queryUser.name,
    email: queryUser.email,
    businessSubscription: queryUser.businessSubscriptionId,
    role: queryUser.role,
  });

  return token;
};
