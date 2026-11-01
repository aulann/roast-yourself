import { describe, expect, it, vi } from "vitest";
import { buildSteamLoginUrl, verifySteamResponse } from "./openid";

const RETURN_TO = "https://app.test/api/steam/callback?locale=pl&state=abc";
const STEAM_ID = "76561198000000000";
const CLAIMED = `https://steamcommunity.com/openid/id/${STEAM_ID}`;

function response(overrides: Record<string, string> = {}) {
  return new URLSearchParams({
    "openid.mode": "id_res",
    "openid.op_endpoint": "https://steamcommunity.com/openid/login",
    "openid.return_to": RETURN_TO,
    "openid.claimed_id": CLAIMED,
    "openid.identity": CLAIMED,
    "openid.signed":
      "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "signature",
    ...overrides,
  });
}

function steamSays(body: string) {
  return vi.fn<typeof fetch>(async () => new Response(body));
}

describe("buildSteamLoginUrl", () => {
  it("asks Steam to return to our callback", () => {
    const url = new URL(buildSteamLoginUrl(RETURN_TO));
    expect(url.origin).toBe("https://steamcommunity.com");
    expect(url.searchParams.get("openid.return_to")).toBe(RETURN_TO);
    expect(url.searchParams.get("openid.realm")).toBe("https://app.test");
  });
});

describe("verifySteamResponse", () => {
  it("returns the SteamID once Steam confirms the response", async () => {
    const fetchFn = steamSays("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n");
    expect(await verifySteamResponse(response(), RETURN_TO, fetchFn)).toBe(
      STEAM_ID,
    );

    const body = fetchFn.mock.calls[0][1]?.body as URLSearchParams;
    expect(body.get("openid.mode")).toBe("check_authentication");
    expect(body.get("openid.sig")).toBe("signature");
  });

  it("accepts the http form of the claimed id", async () => {
    const claimed = `http://steamcommunity.com/openid/id/${STEAM_ID}`;
    const params = response({
      "openid.claimed_id": claimed,
      "openid.identity": claimed,
    });
    expect(
      await verifySteamResponse(params, RETURN_TO, steamSays("is_valid:true")),
    ).toBe(STEAM_ID);
  });

  it("rejects a response Steam does not confirm", async () => {
    expect(
      await verifySteamResponse(response(), RETURN_TO, steamSays("is_valid:false")),
    ).toBeNull();
  });

  it.each([
    ["wrong mode", { "openid.mode": "cancel" }],
    ["wrong endpoint", { "openid.op_endpoint": "https://evil.test/login" }],
    ["wrong return url", { "openid.return_to": "https://evil.test/" }],
    [
      "foreign identity",
      { "openid.claimed_id": "https://evil.test/openid/id/76561198000000000" },
    ],
    ["mismatched identity", { "openid.identity": "https://steamcommunity.com/openid/id/76561198000000001" }],
    ["unsigned claimed id", { "openid.signed": "op_endpoint,identity,return_to" }],
  ])("rejects %s without asking Steam", async (_name, overrides) => {
    const fetchFn = steamSays("is_valid:true");
    expect(
      await verifySteamResponse(response(overrides), RETURN_TO, fetchFn),
    ).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
