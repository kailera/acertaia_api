import { compare } from "bcryptjs";

export const verifyPassword = async (password: string, hash: string) => {
  const result = await compare(password, hash);
  return result;
};
