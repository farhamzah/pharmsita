import { hashPassword } from "./lib/password-hash.mjs";

const password = process.env.PHARMSITA_PASSWORD || process.argv[2] || "";

if (!password) {
  console.error("Usage:");
  console.error("  $env:PHARMSITA_PASSWORD=\"temporary-password\"; npm.cmd run auth:hash-password");
  console.error("  npm.cmd run auth:hash-password -- temporary-password");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

console.log(hashPassword(password));
