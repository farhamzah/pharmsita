import crypto from "node:crypto";

const keyLength = 64;

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, keyLength).toString("hex");
  return `scrypt:${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, keyLength);
  const expected = Buffer.from(hash, "hex");

  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
};
