import type { SteamStats } from "@/sources/steam/stats";

const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
const SHAMEFUL_BACKLOG_SHARE = 0.3;
const OBSESSIVE_TOP_SHARE = 0.5;

export type DeckGame = { name: string; hours: number; share: number };

export type CoverHeadline =
  | { kind: "backlog"; share: number }
  | { kind: "obsession"; game: string; hours: number }
  | { kind: "hours"; hours: number }
  | { kind: "unknown" };

export type DeckSlide =
  | { type: "opening"; name: string; games: number }
  | { type: "hours"; hours: number; days: number }
  | { type: "suspect"; game: DeckGame }
  | { type: "ranking"; games: DeckGame[] }
  | { type: "backlog"; neverPlayed: number; total: number; share: number }
  | { type: "dropped"; count: number }
  | { type: "abandoned"; game: string; hours: number; years: number }
  | { type: "recent"; hours: number }
  | { type: "verdict"; variant: "full" | "hidden" | "empty" }
  | { type: "cover"; name: string; headline: CoverHeadline };

export function currentUnixSeconds() {
  return Math.floor(Date.now() / 1000);
}

function toHours(minutes: number) {
  return Math.round(minutes / 60);
}

function pickHeadline(stats: SteamStats): CoverHeadline {
  const { playtime } = stats;
  if (!playtime) return { kind: "unknown" };
  if (playtime.neverPlayedShare >= SHAMEFUL_BACKLOG_SHARE) {
    return { kind: "backlog", share: playtime.neverPlayedShare };
  }
  if (playtime.topGameShare >= OBSESSIVE_TOP_SHARE) {
    const top = playtime.topGames[0];
    return { kind: "obsession", game: top.name, hours: toHours(top.minutes) };
  }
  return { kind: "hours", hours: toHours(playtime.totalMinutes) };
}

export function buildSteamDeck(
  name: string,
  stats: SteamStats,
  nowSeconds: number,
): DeckSlide[] {
  const { totalGames, playtime } = stats;
  const opening: DeckSlide = { type: "opening", name, games: totalGames };
  const cover: DeckSlide = {
    type: "cover",
    name,
    headline: pickHeadline(stats),
  };

  if (!playtime) {
    const variant = totalGames === 0 ? "empty" : "hidden";
    return [opening, { type: "verdict", variant }, cover];
  }

  const totalHours = toHours(playtime.totalMinutes);
  const games = playtime.topGames.map((game) => ({
    name: game.name,
    hours: toHours(game.minutes),
    share: game.minutes / playtime.totalMinutes,
  }));
  const { abandoned } = playtime;

  return [
    opening,
    { type: "hours", hours: totalHours, days: Math.floor(totalHours / 24) },
    { type: "suspect", game: games[0] },
    ...(games.length > 1 ? [{ type: "ranking", games } as const] : []),
    ...(playtime.neverPlayed > 0
      ? [
          {
            type: "backlog",
            neverPlayed: playtime.neverPlayed,
            total: totalGames,
            share: playtime.neverPlayedShare,
          } as const,
        ]
      : []),
    ...(playtime.barelyPlayed > 0
      ? [{ type: "dropped", count: playtime.barelyPlayed } as const]
      : []),
    ...(abandoned
      ? [
          {
            type: "abandoned",
            game: abandoned.name,
            hours: toHours(abandoned.minutes),
            years: Math.floor(
              (nowSeconds - abandoned.lastPlayedAt) / SECONDS_IN_YEAR,
            ),
          } as const,
        ]
      : []),
    { type: "recent", hours: toHours(playtime.lastTwoWeeksMinutes) },
    { type: "verdict", variant: "full" },
    cover,
  ];
}
