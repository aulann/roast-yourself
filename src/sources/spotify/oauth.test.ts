import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  createSpotifyLink,
  exchangeCode,
  isSpotifyOAuthEnabled,
  readSpotifyLink,
} from "./oauth";

const REDIRECT = "https://app.test/api/spotify/callback";

beforeEach(() => {
  vi.stubEnv("SPOTIFY_CLIENT_ID", "client");
  vi.stubEnv("SPOTIFY_CLIENT_SECRET", "secret");
  vi.stubEnv("SPOTIFY_LINK_SECRET", "link-secret");
});

describe("isSpotifyOAuthEnabled", () => {
  it("is off unless switched on", () => {
    vi.stubEnv("SPOTIFY_OAUTH_ENABLED", "");
    expect(isSpotifyOAuthEnabled()).toBe(false);
    vi.stubEnv("SPOTIFY_OAUTH_ENABLED", "true");
    expect(isSpotifyOAuthEnabled()).toBe(true);
  });
});

describe("buildAuthorizeUrl", () => {
  it("asks only for what the stats need", () => {
    const url = new URL(buildAuthorizeUrl(REDIRECT, "state-1"));
    expect(url.origin).toBe("https://accounts.spotify.com");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT);
    expect(url.searchParams.get("scope")).toBe(
      "user-top-read user-read-recently-played",
    );
  });
});

describe("exchangeCode", () => {
  it("sends the credentials and keeps no refresh token", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    );
    const result = await exchangeCode("code", REDIRECT, fetchFn);

    expect(result).toEqual({ accessToken: "access", maxAge: 3000 });
    const init = fetchFn.mock.calls[0][1];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Basic ${Buffer.from("client:secret").toString("base64")}`,
    );
    expect((init?.body as URLSearchParams).get("code")).toBe("code");
  });

  it("never outlives the token", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({ access_token: "a", expires_in: 60 }),
    );
    expect((await exchangeCode("c", REDIRECT, fetchFn))?.maxAge).toBe(60);
  });

  it("returns nothing when Spotify refuses", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response("", { status: 400 }),
    );
    expect(await exchangeCode("c", REDIRECT, fetchFn)).toBeNull();
  });
});

describe("spotify link", () => {
  it("gives the token back to the same user", () => {
    const link = createSpotifyLink("user_1", "token", 60, 1000);
    expect(readSpotifyLink(link, "user_1", 1000)).toBe("token");
  });

  it("does not work for another signed-in user", () => {
    const link = createSpotifyLink("user_1", "token", 60, 1000);
    expect(readSpotifyLink(link, "user_2", 1000)).toBeNull();
  });

  it("expires", () => {
    const link = createSpotifyLink("user_1", "token", 60, 0);
    expect(readSpotifyLink(link, "user_1", 60_000)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(readSpotifyLink("garbage", "user_1")).toBeNull();
  });
});
