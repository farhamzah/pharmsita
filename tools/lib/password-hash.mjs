import crypto from "node:crypto";

const keyLength = 64;

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, keyLength).toString("hex");
  return `scrypt:${salt}:${hash}`;
};
