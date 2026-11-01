import type { SteamGame } from "./client";

const TOP_GAMES = 5;
const UNPLAYED_SAMPLE = 5;
const MAX_NAME_LENGTH = 120;
const BARELY_PLAYED_MINUTES = 60;
const ABANDONED_AFTER_SECONDS = 365 * 24 * 60 * 60;

export type SteamStatsGame = { appId: number; name: string; minutes: number };

export type SteamPlaytimeStats = {
  totalMinutes: number;
  lastTwoWeeksMinutes: number;
  playedGames: number;
  neverPlayed: number;
  neverPlayedShare: number;
  barelyPlayed: number;
  topGames: SteamStatsGame[];
  topGameShare: number;
  unplayedSample: string[];
  abandoned: (SteamStatsGame & { lastPlayedAt: number }) | null;
};

export type SteamStats = {
  source: "steam";
  schemaVersion: 1;
  totalGames: number;
  /** Null when the player hides playtime: every game then reports zero minutes. */
  playtime: SteamPlaytimeStats | null;
};

export function gameName(game: SteamGame) {
  const name = game.name?.trim() || `App ${game.appid}`;
  return name.slice(0, MAX_NAME_LENGTH);
}

function toStatsGame(game: SteamGame): SteamStatsGame {
  return {
    appId: game.appid,
    name: gameName(game),
    minutes: game.playtime_forever,
  };
}

export function computeSteamStats(
  games: SteamGame[],
  nowSeconds = Math.floor(Date.now() / 1000),
): SteamStats {
  const stats = { source: "steam", schemaVersion: 1 } as const;
  const played = games.filter((game) => game.playtime_forever > 0);
  if (played.length === 0) {
    return { ...stats, totalGames: games.length, playtime: null };
  }

  const byPlaytime = [...played].sort(
    (a, b) => b.playtime_forever - a.playtime_forever,
  );
  const totalMinutes = played.reduce(
    (sum, game) => sum + game.playtime_forever,
    0,
  );
  const neverPlayed = games.filter((game) => game.playtime_forever === 0);
  const abandoned = byPlaytime.find(
    (game) =>
      game.rtime_last_played &&
      nowSeconds - game.rtime_last_played >= ABANDONED_AFTER_SECONDS,
  );

  return {
    ...stats,
    totalGames: games.length,
    playtime: {
      totalMinutes,
      lastTwoWeeksMinutes: games.reduce(
        (sum, game) => sum + (game.playtime_2weeks ?? 0),
        0,
      ),
      playedGames: played.length,
      neverPlayed: neverPlayed.length,
      neverPlayedShare: neverPlayed.length / games.length,
      barelyPlayed: played.filter(
        (game) => game.playtime_forever < BARELY_PLAYED_MINUTES,
      ).length,
      topGames: byPlaytime.slice(0, TOP_GAMES).map(toStatsGame),
      topGameShare: byPlaytime[0].playtime_forever / totalMinutes,
      unplayedSample: neverPlayed
        .map(gameName)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, UNPLAYED_SAMPLE),
      abandoned: abandoned
        ? {
            ...toStatsGame(abandoned),
            lastPlayedAt: abandoned.rtime_last_played!,
          }
        : null,
    },
  };
}
