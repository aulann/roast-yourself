import { describe, expect, it, vi } from "vitest";
import { fetchSpotifyLibrary } from "./client";

const TRACK = {
  name: "Song",
  artists: [{ name: "Main" }, { name: "Feature" }],
  explicit: true,
  album: { release_date: "1994-05-01" },
};

function spotify(overrides: Record<string, unknown> = {}) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/recently-played")) {
      return Response.json({
        items: [{ track: TRACK, played_at: "2024-01-01T10:00:00Z" }],
        ...overrides,
      });
    }
    return Response.json({
      items: url.pathname.endsWith("/artists")
        ? [{ name: `Artist ${url.searchParams.get("time_range")}` }]
        : [TRACK],
    });
  });
}

describe("fetchSpotifyLibrary", () => {
  it("collects both time ranges and recent plays", async () => {
    const result = await fetchSpotifyLibrary("token", spotify());
    if (result.status !== "ok") throw new Error("Expected a library");

    expect(result.library.yearArtists).toEqual(["Artist long_term"]);
    expect(result.library.monthArtists).toEqual(["Artist short_term"]);
    expect(result.library.yearTracks[0]).toEqual({
      name: "Song",
      artist: "Main",
      year: 1994,
      explicit: true,
    });
    expect(result.library.recent[0].playedAt).toBe(
      Date.UTC(2024, 0, 1, 10),
    );
  });

  it("sends the token and asks for the largest page", async () => {
    const fetchFn = spotify();
    await fetchSpotifyLibrary("token", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(5);
    const [input, init] = fetchFn.mock.calls[0];
    expect(new URL(String(input)).searchParams.get("limit")).toBe("50");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token");
  });

  it("copes with removed optional fields", async () => {
    const fetchFn = vi.fn<typeof fetch>(async (input) =>
      Response.json(
        String(input).includes("recently-played")
          ? { items: [] }
          : String(input).includes("/artists")
            ? { items: [{ name: "A" }] }
            : { items: [{ name: "S", artists: [{ name: "A" }] }] },
      ),
    );
    const result = await fetchSpotifyLibrary("token", fetchFn);
    if (result.status !== "ok") throw new Error("Expected a library");
    expect(result.library.yearTracks[0]).toMatchObject({
      year: null,
      explicit: false,
    });
  });

  it.each([
    [401, "expired"],
    [403, "not_allowed"],
  ])("reports %i as %s", async (status, expected) => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response("", { status }),
    );
    expect(await fetchSpotifyLibrary("token", fetchFn)).toEqual({
      status: expected,
    });
  });

  it("does not put the token in other errors", async () => {
    const fetchFn = vi.fn<typeof fetch>(
      async () => new Response("", { status: 500 }),
    );
    const error = await fetchSpotifyLibrary("secret-token", fetchFn).catch(
      (e) => e,
    );
    expect(error.message).not.toContain("secret-token");
  });
});
