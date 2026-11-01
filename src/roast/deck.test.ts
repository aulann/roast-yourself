import { describe, expect, it } from "vitest";
import { computeSteamStats } from "@/sources/steam/stats";
import { computeSpotifyLiveStats } from "@/sources/spotify/live-stats";
import { buildSpotifyLiveDeck, buildSteamDeck } from "./deck";
import { DEMO_DECK } from "./demo";

const NOW = 2_000_000_000;
const YEAR = 365 * 24 * 60 * 60;

function game(appid: number, minutes: number, lastPlayed = 0) {
  return {
    appid,
    name: `Game ${appid}`,
    playtime_forever: minutes,
    rtime_last_played: lastPlayed,
  };
}

function deck(games: ReturnType<typeof game>[]) {
  return buildSteamDeck("Gracz", computeSteamStats(games, NOW), NOW);
}

function types(games: ReturnType<typeof game>[]) {
  return deck(games).map((slide) => slide.type);
}

describe("buildSteamDeck", () => {
  it("uses every slide when the data is there", () => {
    expect(
      types([game(1, 6000, NOW - 2 * YEAR), game(2, 30), game(3, 0)]),
    ).toEqual([
      "opening",
      "hours",
      "suspect",
      "ranking",
      "backlog",
      "dropped",
      "abandoned",
      "recent",
      "verdict",
      "cover",
    ]);
  });

  it("skips slides without data", () => {
    expect(types([game(1, 6000)])).toEqual([
      "opening",
      "hours",
      "suspect",
      "recent",
      "verdict",
      "cover",
    ]);
  });

  it("never invents playtime when it is hidden", () => {
    expect(types([game(1, 0), game(2, 0)])).toEqual([
      "opening",
      "verdict",
      "cover",
    ]);
    expect(deck([game(1, 0)])[1]).toMatchObject({ variant: "hidden" });
  });

  it("treats an empty library separately", () => {
    expect(deck([])[1]).toMatchObject({ variant: "empty" });
  });

  it("counts whole years since a game was abandoned", () => {
    const slide = deck([game(1, 6000, NOW - 2.5 * YEAR)]).find(
      (s) => s.type === "abandoned",
    );
    expect(slide).toMatchObject({ years: 2, hours: 100 });
  });

  it.each([
    ["backlog", [game(1, 6000), game(2, 0)]],
    ["obsession", [game(1, 6000), game(2, 60)]],
    ["hours", [game(1, 600), game(2, 600), game(3, 600)]],
    ["unknown", [game(1, 0)]],
  ])("puts the worst stat on the cover: %s", (kind, games) => {
    expect(deck(games).at(-1)).toMatchObject({
      type: "cover",
      headline: { kind },
    });
  });

  it("gives the demo a full deck", () => {
    expect(DEMO_DECK).toHaveLength(10);
  });
});

describe("buildSpotifyLiveDeck", () => {
  const track = (name: string, artist = "Main", year = 1994) => ({
    name,
    artist,
    year,
    explicit: true,
  });

  it("uses every slide when the data is there", () => {
    const stats = computeSpotifyLiveStats(
      {
        yearArtists: ["Main"],
        monthArtists: ["New"],
        yearTracks: [track("1"), track("2"), track("3")],
        monthTracks: [],
        recent: Array.from({ length: 6 }, () => ({
          ...track("1"),
          playedAt: 0,
        })),
      },
      "UTC",
    );
    const deck = buildSpotifyLiveDeck(stats!);
    expect(deck.map((slide) => slide.type)).toEqual([
      "live_opening",
      "live_artists",
      "live_tracks",
      "live_dominant",
      "live_month",
      "live_repeat",
      "live_decade",
      "live_explicit",
      "verdict",
      "cover",
    ]);
    expect(deck.at(-1)).toMatchObject({
      headline: { kind: "repeat", count: 6, plays: 6 },
    });
  });

  it("skips what the account does not have", () => {
    const stats = computeSpotifyLiveStats(
      {
        yearArtists: ["Main"],
        monthArtists: [],
        yearTracks: [],
        monthTracks: [],
        recent: [],
      },
      "UTC",
    );
    const deck = buildSpotifyLiveDeck(stats!);
    expect(deck.map((slide) => slide.type)).toEqual([
      "live_opening",
      "live_artists",
      "verdict",
      "cover",
    ]);
    expect(deck.at(-1)).toMatchObject({ headline: { kind: "unknown" } });
  });
});
