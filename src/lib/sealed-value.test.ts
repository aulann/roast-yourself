import { describe, expect, it } from "vitest";
import { openSealedValue, sealValue } from "./sealed-value";

describe("sealed values", () => {
  it("reads back what was sealed", () => {
    expect(openSealedValue(sealValue({ a: 1 }, "secret"), "secret")).toEqual({
      a: 1,
    });
  });

  it("hides the content", () => {
    const token = sealValue({ accessToken: "visible-token" }, "secret");
    const decoded = token
      .split(".")
      .map((part) => Buffer.from(part, "base64url").toString())
      .join("");
    expect(decoded).not.toContain("visible-token");
  });

  it("rejects a different secret", () => {
    expect(openSealedValue(sealValue({ a: 1 }, "one"), "two")).toBeNull();
  });

  it("rejects a changed value", () => {
    const [iv, tag, body] = sealValue({ a: 1 }, "secret").split(".");
    const forged = Buffer.from(body, "base64url");
    forged[0] ^= 1;
    expect(
      openSealedValue(`${iv}.${tag}.${forged.toString("base64url")}`, "secret"),
    ).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(openSealedValue("", "secret")).toBeNull();
    expect(openSealedValue("a.b.c", "secret")).toBeNull();
  });
});
