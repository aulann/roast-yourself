import { describe, expect, it } from "vitest";
import {
  computeSpotifyLiveStats,
  liveTrackKey,
  type LibraryTrack,
  type SpotifyLibrary,
} from "./live-stats";

function track(name: string, artist = "Artist", extra: Partial<LibraryTrack> = {}) {
  return { name, artist, year: null, explicit: false, ...extra };
}

function library(overrides: Partial<SpotifyLibrary> = {}): SpotifyLibrary {
  return {
    yearArtists: ["Artist"],
    yearTracks: [track("Song")],
    monthArtists: ["Artist"],
    monthTracks: [],
    recent: [],
    ...overrides,
  };
}

function stats(overrides: Partial<SpotifyLibrary> = {}, timeZone = "UTC") {
  const result = computeSpotifyLiveStats(library(overrides), timeZone);
  if (!result) throw new Error("Expected stats");
  return result;
}

describe("computeSpotifyLiveStats", () => {
  it("keeps the top five in Spotify's order", () => {
    const artists = ["A", "B", "C", "D", "E", "F"];
    expect(stats({ yearArtists: artists }).topArtists).toEqual(
      artists.slice(0, 5),
    );
  });

  it("notices a favourite that stayed the same", () => {
    expect(stats().sameFavourite).toBe(true);
    expect(
      stats({ yearArtists: ["Old"], monthArtists: ["New", "Old"] }),
    ).toMatchObject({ sameFavourite: false, monthFavourite: "New", newFaces: 1 });
  });

  it("finds an artist dominating the top tracks", () => {
    const yearTracks = [
      track("1", "Main"),
      track("2", "Main"),
      track("3", "Main"),
      track("4", "Other"),
    ];
    expect(stats({ yearTracks }).dominant).toEqual({
      artist: "Main",
      count: 3,
      total: 4,
    });
  });

  it("does not call two tracks dominance", () => {
    const yearTracks = [track("1", "Main"), track("2", "Main")];
    expect(stats({ yearTracks }).dominant).toBeNull();
  });

  it("finds the favourite decade and ignores unknown years", () => {
    const yearTracks = [
      track("1", "A", { year: 1994 }),
      track("2", "A", { year: 1999 }),
      track("3", "A", { year: 2021 }),
      track("4", "A"),
    ];
    const { decade } = stats({ yearTracks });
    expect(decade?.decade).toBe(1990);
    expect(decade?.share).toBeCloseTo(2 / 3);
    expect(stats().decade).toBeNull();
  });

  it("measures explicit tracks", () => {
    const yearTracks = [
      track("1", "A", { explicit: true }),
      track("2", "A"),
    ];
    expect(stats({ yearTracks }).explicitShare).toBe(0.5);
  });

  it("finds repeats in recent plays from three upwards", () => {
    const play = (name: string) => ({ ...track(name), playedAt: 0 });
    expect(
      stats({ recent: [play("A"), play("A"), play("A"), play("B")] }).recent,
    ).toMatchObject({
      plays: 4,
      artists: 1,
      repeat: { name: "A", count: 3 },
    });
    expect(stats({ recent: [play("A"), play("A")] }).recent.repeat).toBeNull();
  });

  it("uses the listener's time zone for night plays", () => {
    const recent = [
      { ...track("A"), playedAt: Date.UTC(2024, 0, 1, 23, 30) },
    ];
    expect(stats({ recent }).recent.nightPlays).toBe(0);
    expect(stats({ recent }, "Europe/Warsaw").recent.nightPlays).toBe(1);
  });

  it("removes excluded artists and tracks everywhere", () => {
    const hidden = track("Secret", "Hidden");
    const shame = track("Shame", "Seen");
    const result = computeSpotifyLiveStats(
      library({
        yearArtists: ["Hidden", "Seen"],
        monthArtists: ["Hidden"],
        yearTracks: [hidden, shame, track("Fine", "Seen")],
        recent: [{ ...hidden, playedAt: 0 }, { ...shame, playedAt: 0 }],
      }),
      "UTC",
      { artists: ["Hidden"], tracks: [liveTrackKey(shame)] },
    );
    const text = JSON.stringify(result);
    expect(text).not.toContain("Hidden");
    expect(text).not.toContain("Secret");
    expect(text).not.toContain("Shame");
    expect(result?.topArtists).toEqual(["Seen"]);
  });

  it("returns nothing for an empty account", () => {
    expect(
      computeSpotifyLiveStats(
        library({ yearArtists: [], yearTracks: [], monthArtists: [] }),
        "UTC",
      ),
    ).toBeNull();
  });
});
