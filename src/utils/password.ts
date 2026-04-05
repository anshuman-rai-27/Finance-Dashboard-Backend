import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const isStrongPassword = (password: string) => {
  return STRONG_PASSWORD_REGEX.test(password);
};
