import { compare, genSaltSync, hashSync } from "bcryptjs";

export const generateSecurePassword = async (password: string) => {
  const salt = genSaltSync(10);
  const result = hashSync(password, salt);
  return result;
};

export const verifyPassword = async (password: string, hash: string) => {
  const result = await compare(password, hash);
  return result;
};
