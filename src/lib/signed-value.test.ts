import { describe, expect, it } from "vitest";
import { readSignedValue, signValue } from "./signed-value";

describe("signed values", () => {
  it("reads back what was signed", () => {
    const token = signValue({ steamId: "1" }, "secret");
    expect(readSignedValue(token, "secret")).toEqual({ steamId: "1" });
  });

  it("rejects a different secret", () => {
    expect(readSignedValue(signValue({ a: 1 }, "one"), "two")).toBeNull();
  });

  it("rejects a changed payload", () => {
    const [, sig] = signValue({ steamId: "1" }, "secret").split(".");
    const forged = Buffer.from('{"steamId":"2"}').toString("base64url");
    expect(readSignedValue(`${forged}.${sig}`, "secret")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(readSignedValue("", "secret")).toBeNull();
    expect(readSignedValue("a.b.c", "secret")).toBeNull();
  });
});
