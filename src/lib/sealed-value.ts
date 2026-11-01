import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyFrom(secret: string) {
  return createHash("sha256").update(secret).digest();
}

/** Unlike a signature, this also hides the content: for values the browser must not read. */
export function sealValue(payload: unknown, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(payload)),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), body]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function openSealedValue(token: string, secret: string): unknown {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const [iv, tag, body] = parts.map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), iv);
    decipher.setAuthTag(tag);
    const text = Buffer.concat([decipher.update(body), decipher.final()]);
    return JSON.parse(text.toString());
  } catch {
    return null;
  }
}
