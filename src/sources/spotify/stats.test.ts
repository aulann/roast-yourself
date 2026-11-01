import { describe, expect, it } from "vitest";
import type { Play } from "./parse";
import { computeSpotifyStats, spotifyStatsSchema, trackKey } from "./stats";

// Monday 2024-03-11 at 12:00 UTC.
const MONDAY_NOON = Date.UTC(2024, 2, 11, 12);
const MINUTE = 60_000;

function play(overrides: Partial<Play> = {}): Play {
  return {
    artist: "Artist",
    track: "Song",
    endedAt: MONDAY_NOON,
    ms: 3 * MINUTE,
    skipped: null,
    ...overrides,
  };
}

function stats(plays: Play[], timeZone = "UTC") {
  const result = computeSpotifyStats(plays, timeZone);
  if (!result) throw new Error("Expected stats");
  return result;
}

describe("computeSpotifyStats", () => {
  it("adds up time but only counts real listens as plays", () => {
    const result = stats([play(), play({ ms: 10_000 })]);
    expect(result.totalMinutes).toBeCloseTo(3 + 10 / 60);
    expect(result.plays).toBe(1);
  });

  it("ranks artists by time and tracks by plays", () => {
    const result = stats([
      play({ artist: "Long", track: "Epic", ms: 60 * MINUTE }),
      play({ artist: "Short", track: "Hit" }),
      play({ artist: "Short", track: "Hit" }),
    ]);
    expect(result.topArtists[0].name).toBe("Long");
    expect(result.topTracks[0].name).toBe("Hit");
    expect(result.topArtistShare).toBeCloseTo(60 / 66);
    expect(result.artists).toBe(2);
  });

  it("keeps same-named tracks by different artists apart", () => {
    const result = stats([
      play({ artist: "A", track: "Intro" }),
      play({ artist: "B", track: "Intro" }),
    ]);
    expect(result.topTracks).toHaveLength(2);
  });

  it("uses the listener's time zone for the clock", () => {
    const result = stats(
      [play({ endedAt: Date.UTC(2024, 2, 10, 23, 30) })],
      "Europe/Warsaw",
    );
    // Sunday 23:30 UTC is already Monday 00:30 in Warsaw.
    expect(result.peak).toEqual({ day: 0, hour: 0 });
    expect(result.nightMinutes).toBe(3);
    expect(result.heatmap[0][0]).toBe(3);
  });

  it("does not count daytime as night", () => {
    expect(stats([play()]).nightMinutes).toBe(0);
  });

  it("reads years across the whole history", () => {
    const result = stats([
      play({ endedAt: Date.UTC(2019, 5, 1) }),
      play({ endedAt: Date.UTC(2024, 5, 1) }),
    ]);
    expect(result).toMatchObject({ firstYear: 2019, lastYear: 2024 });
  });

  it("finds the longest loop in time order, whatever the input order", () => {
    const result = stats([
      play({ track: "Loop", endedAt: MONDAY_NOON + 3 }),
      play({ track: "Other", endedAt: MONDAY_NOON + 5 }),
      play({ track: "Loop", endedAt: MONDAY_NOON + 1 }),
      play({ track: "Loop", endedAt: MONDAY_NOON + 2 }),
    ]);
    expect(result.loop).toMatchObject({ name: "Loop", run: 3 });
  });

  it("ignores very short plays when counting a loop", () => {
    const result = stats([
      play({ track: "Loop", endedAt: MONDAY_NOON + 1 }),
      play({ track: "Loop", endedAt: MONDAY_NOON + 2 }),
      play({ track: "Blip", endedAt: MONDAY_NOON + 3, ms: 5000 }),
      play({ track: "Loop", endedAt: MONDAY_NOON + 4 }),
    ]);
    expect(result.loop?.run).toBe(3);
  });

  it("has no loop below three repeats", () => {
    expect(stats([play(), play()]).loop).toBeNull();
  });

  it("reports skips only when the export has them", () => {
    expect(stats([play()]).skips).toBeNull();
    expect(
      stats([play({ skipped: true }), play({ skipped: false }), play()]).skips,
    ).toEqual({ count: 1, share: 0.5 });
  });

  it("leaves out excluded artists and tracks", () => {
    const hidden = play({ artist: "Hidden", track: "Secret" });
    const other = play({ artist: "Other", track: "Hit" });
    const seen = play({ artist: "Seen", track: "Shame" });

    const result = computeSpotifyStats([hidden, other, seen], "UTC", {
      artists: ["Hidden"],
      tracks: [trackKey(seen)],
    });
    expect(result?.artists).toBe(1);
    expect(JSON.stringify(result)).not.toContain("Hidden");
    expect(JSON.stringify(result)).not.toContain("Shame");
  });

  it("returns nothing when no plays are left", () => {
    expect(computeSpotifyStats([], "UTC")).toBeNull();
    expect(
      computeSpotifyStats([play()], "UTC", { artists: ["Artist"], tracks: [] }),
    ).toBeNull();
  });
});

describe("spotifyStatsSchema", () => {
  it("accepts real stats and cleans names", () => {
    const valid = stats([play()]);
    expect(spotifyStatsSchema.safeParse(valid).success).toBe(true);

    const parsed = spotifyStatsSchema.parse({
      ...valid,
      topArtists: [{ name: "  Bad\nName ", minutes: 1, plays: 1 }],
    });
    expect(parsed.topArtists[0].name).toBe("Bad Name");
  });

  it.each([
    ["an oversized name", { topArtists: [{ name: "x".repeat(121), minutes: 1, plays: 1 }] }],
    ["too many artists", { topArtists: Array(6).fill({ name: "x", minutes: 1, plays: 1 }) }],
    ["a share above 100%", { nightShare: 2 }],
    ["a malformed heatmap", { heatmap: [[1]] }],
    ["a negative count", { plays: -1 }],
  ])("rejects %s", (_name, overrides) => {
    expect(
      spotifyStatsSchema.safeParse({ ...stats([play()]), ...overrides }).success,
    ).toBe(false);
  });
});
