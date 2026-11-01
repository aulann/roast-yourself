import { describe, expect, it } from "vitest";
import { requestOrigin } from "./request-origin";

describe("requestOrigin", () => {
  it("prefers the address the browser used", () => {
    const request = new Request("http://localhost:3000/api/spotify/connect", {
      headers: { host: "127.0.0.1:3000" },
    });
    expect(requestOrigin(request)).toBe("http://127.0.0.1:3000");
  });

  it("keeps https", () => {
    const request = new Request("https://internal.test/x", {
      headers: { host: "app.test" },
    });
    expect(requestOrigin(request)).toBe("https://app.test");
  });

  it("falls back to the request URL", () => {
    expect(requestOrigin(new Request("https://app.test/x"))).toBe(
      "https://app.test",
    );
  });
});
