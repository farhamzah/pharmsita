import crypto from "node:crypto";

const base64Url = (input: Buffer | string) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return Buffer.from(padded, "base64").toString("utf8");
};

export interface AccessTokenPayload {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

export const createRandomToken = () => base64Url(crypto.randomBytes(48));

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const signAccessToken = (
  payload: AccessTokenPayload,
  secret: string
) => {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest();

  return `${encodedPayload}.${base64Url(signature)}`;
};

export const verifyAccessToken = (token: string, secret: string) => {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = base64Url(
    crypto.createHmac("sha256", secret).update(encodedPayload).digest()
  );

  const received = Buffer.from(encodedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !crypto.timingSafeEqual(received, expected)
  ) {
    return null;
  }

  let payload: AccessTokenPayload;

  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as AccessTokenPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || payload.exp <= now) {
    return null;
  }

  return payload;
};
