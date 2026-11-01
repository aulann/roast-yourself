import { describe, expect, it } from "vitest";
import type { SteamGame } from "./client";
import { computeSteamStats } from "./stats";

const NOW = 2_000_000_000;
const YEAR = 365 * 24 * 60 * 60;

function game(appid: number, minutes: number, extra: Partial<SteamGame> = {}) {
  return {
    appid,
    name: `Game ${appid}`,
    playtime_forever: minutes,
    ...extra,
  };
}

describe("computeSteamStats", () => {
  it("sums playtime and counts the backlog", () => {
    const { totalGames, playtime } = computeSteamStats(
      [
        game(1, 300, { playtime_2weeks: 30 }),
        game(2, 30),
        game(3, 0),
        game(4, 0),
      ],
      NOW,
    );

    expect(totalGames).toBe(4);
    expect(playtime).toMatchObject({
      totalMinutes: 330,
      lastTwoWeeksMinutes: 30,
      playedGames: 2,
      neverPlayed: 2,
      neverPlayedShare: 0.5,
      barelyPlayed: 1,
    });
  });

  it("ranks the top games and measures the obsession", () => {
    const { playtime } = computeSteamStats(
      [game(1, 100), game(2, 300), game(3, 0)],
      NOW,
    );
    expect(playtime?.topGames.map((g) => g.appId)).toEqual([2, 1]);
    expect(playtime?.topGameShare).toBe(0.75);
  });

  it("keeps only five top games", () => {
    const games = [1, 2, 3, 4, 5, 6].map((id) => game(id, id));
    expect(computeSteamStats(games, NOW).playtime?.topGames).toHaveLength(5);
  });

  it("finds the most played game untouched for a year", () => {
    const { playtime } = computeSteamStats(
      [
        game(1, 900, { rtime_last_played: NOW - 10 }),
        game(2, 500, { rtime_last_played: NOW - 2 * YEAR }),
        game(3, 100, { rtime_last_played: NOW - 3 * YEAR }),
      ],
      NOW,
    );
    expect(playtime?.abandoned?.appId).toBe(2);
  });

  it("does not call a game abandoned without a last played date", () => {
    const { playtime } = computeSteamStats(
      [game(1, 900, { rtime_last_played: 0 })],
      NOW,
    );
    expect(playtime?.abandoned).toBeNull();
  });

  it("has no playtime stats when all playtime is hidden", () => {
    const stats = computeSteamStats([game(1, 0), game(2, 0)], NOW);
    expect(stats.totalGames).toBe(2);
    expect(stats.playtime).toBeNull();
  });

  it("handles an empty library", () => {
    const stats = computeSteamStats([], NOW);
    expect(stats.totalGames).toBe(0);
    expect(stats.playtime).toBeNull();
  });

  it("cleans game names", () => {
    const { playtime } = computeSteamStats(
      [
        { appid: 1, playtime_forever: 10 },
        game(2, 5, { name: "x".repeat(500) }),
      ],
      NOW,
    );
    expect(playtime?.topGames[0].name).toBe("App 1");
    expect(playtime?.topGames[1].name).toHaveLength(120);
  });
});
