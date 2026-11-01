import { createHmac, timingSafeEqual } from "node:crypto";

function signature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest();
}

export function signValue(payload: unknown, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body, secret).toString("base64url")}`;
}

export function readSignedValue(token: string, secret: string): unknown {
  const [body, received, ...rest] = token.split(".");
  if (!body || !received || rest.length > 0) return null;

  const expected = signature(body, secret);
  const actual = Buffer.from(received, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  return JSON.parse(Buffer.from(body, "base64url").toString());
}
