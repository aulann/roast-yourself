import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSteamProfile, SteamApiError } from "./client";

const PUBLIC_PLAYER = {
  response: {
    players: [{ personaname: "Gracz", communityvisibilitystate: 3 }],
  },
};

function steamReturns(summaries: unknown, owned: unknown) {
  return vi.fn<typeof fetch>(async (input) =>
    Response.json(String(input).includes("GetPlayerSummaries") ? summaries : owned),
  );
}

beforeEach(() => {
  vi.stubEnv("STEAM_WEB_API_KEY", "secret-key");
});

describe("fetchSteamProfile", () => {
  it("returns games from a public profile", async () => {
    const game = { appid: 1, name: "Gra", playtime_forever: 90 };
    const profile = await fetchSteamProfile(
      "1",
      steamReturns(PUBLIC_PLAYER, { response: { game_count: 1, games: [game] } }),
    );
    expect(profile).toEqual({ status: "ok", name: "Gracz", games: [game] });
  });

  it("treats an account with no games as public", async () => {
    const profile = await fetchSteamProfile(
      "1",
      steamReturns(PUBLIC_PLAYER, { response: { game_count: 0 } }),
    );
    expect(profile).toEqual({ status: "ok", name: "Gracz", games: [] });
  });

  it("reports hidden game details as private", async () => {
    const profile = await fetchSteamProfile(
      "1",
      steamReturns(PUBLIC_PLAYER, { response: {} }),
    );
    expect(profile).toEqual({ status: "private", name: "Gracz" });
  });

  it("reports a private profile as private", async () => {
    const privatePlayer = {
      response: {
        players: [{ personaname: "Gracz", communityvisibilitystate: 1 }],
      },
    };
    const profile = await fetchSteamProfile(
      "1",
      steamReturns(privatePlayer, { response: {} }),
    );
    expect(profile.status).toBe("private");
  });

  it("reports an unknown account", async () => {
    const profile = await fetchSteamProfile(
      "1",
      steamReturns({ response: { players: [] } }, { response: {} }),
    );
    expect(profile).toEqual({ status: "not_found" });
  });

  it("keeps the API key out of errors", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response("", { status: 403 }),
    );
    const error = await fetchSteamProfile("1", fetchFn).catch((e) => e);
    expect(error).toBeInstanceOf(SteamApiError);
    expect(error.message).not.toContain("secret-key");
  });
});
