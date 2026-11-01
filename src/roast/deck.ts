import type { SpotifyLiveStats } from "@/sources/spotify/live-stats";
import type { SpotifyStats } from "@/sources/spotify/stats";
import type { SteamStats } from "@/sources/steam/stats";

const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;
const SHAMEFUL_BACKLOG_SHARE = 0.3;
const OBSESSIVE_TOP_SHARE = 0.5;
const NOTABLE_NIGHT_SHARE = 0.05;
const NOTABLE_LOOP_RUN = 10;
const NOTABLE_DECADE_SHARE = 0.4;
const NOTABLE_EXPLICIT_SHARE = 0.2;
const NOTABLE_REPEATS = 5;

export type DeckGame = { name: string; hours: number; share: number };
export type DeckTrack = { name: string; artist: string; plays: number };

export type CoverHeadline =
  | { kind: "backlog"; share: number }
  | { kind: "obsession"; game: string; hours: number }
  | { kind: "hours"; hours: number }
  | { kind: "loop"; track: string; run: number }
  | { kind: "night"; share: number }
  | { kind: "repeat"; track: string; count: number; plays: number }
  | { kind: "dominant"; artist: string; count: number; total: number }
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
  | {
      type: "listen_opening";
      plays: number;
      artists: number;
      fromYear: number;
      toYear: number;
    }
  | { type: "listen_hours"; hours: number; days: number }
  | {
      type: "listen_artist";
      artist: string;
      hours: number;
      plays: number;
      share: number;
    }
  | { type: "listen_tracks"; tracks: DeckTrack[] }
  | {
      type: "listen_clock";
      cells: number[][];
      peakDay: number;
      peakHour: number;
    }
  | { type: "listen_night"; hours: number; share: number }
  | { type: "listen_loop"; track: string; artist: string; run: number }
  | { type: "listen_skips"; count: number; share: number }
  | { type: "live_opening"; artists: number; plays: number }
  | { type: "live_artists"; artists: string[] }
  | { type: "live_tracks"; tracks: { name: string; artist: string }[] }
  | { type: "live_dominant"; artist: string; count: number; total: number }
  | {
      type: "live_month";
      favourite: string;
      sameFavourite: boolean;
      newFaces: number;
      artists: number;
    }
  | {
      type: "live_repeat";
      track: string;
      artist: string;
      count: number;
      plays: number;
    }
  | { type: "live_decade"; decade: number; share: number }
  | { type: "live_explicit"; share: number }
  | { type: "verdict"; variant: "full" | "hidden" | "empty" }
  | { type: "cover"; name?: string; headline: CoverHeadline };

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

function pickListenHeadline(stats: SpotifyStats): CoverHeadline {
  if (stats.loop && stats.loop.run >= NOTABLE_LOOP_RUN) {
    return { kind: "loop", track: stats.loop.name, run: stats.loop.run };
  }
  if (stats.topArtistShare >= OBSESSIVE_TOP_SHARE) {
    const top = stats.topArtists[0];
    return { kind: "obsession", game: top.name, hours: toHours(top.minutes) };
  }
  if (stats.nightShare >= SHAMEFUL_BACKLOG_SHARE) {
    return { kind: "night", share: stats.nightShare };
  }
  return { kind: "hours", hours: toHours(stats.totalMinutes) };
}

export function buildSpotifyDeck(stats: SpotifyStats): DeckSlide[] {
  const totalHours = toHours(stats.totalMinutes);
  const topArtist = stats.topArtists[0];

  return [
    {
      type: "listen_opening",
      plays: stats.plays,
      artists: stats.artists,
      fromYear: stats.firstYear,
      toYear: stats.lastYear,
    },
    { type: "listen_hours", hours: totalHours, days: Math.floor(totalHours / 24) },
    {
      type: "listen_artist",
      artist: topArtist.name,
      hours: toHours(topArtist.minutes),
      plays: topArtist.plays,
      share: stats.topArtistShare,
    },
    {
      type: "listen_tracks",
      tracks: stats.topTracks.map(({ name, artist, plays }) => ({
        name,
        artist,
        plays,
      })),
    },
    {
      type: "listen_clock",
      cells: stats.heatmap,
      peakDay: stats.peak.day,
      peakHour: stats.peak.hour,
    },
    ...(stats.nightShare >= NOTABLE_NIGHT_SHARE
      ? [
          {
            type: "listen_night",
            hours: toHours(stats.nightMinutes),
            share: stats.nightShare,
          } as const,
        ]
      : []),
    ...(stats.loop
      ? [
          {
            type: "listen_loop",
            track: stats.loop.name,
            artist: stats.loop.artist,
            run: stats.loop.run,
          } as const,
        ]
      : []),
    ...(stats.skips && stats.skips.count > 0
      ? [
          {
            type: "listen_skips",
            count: stats.skips.count,
            share: stats.skips.share,
          } as const,
        ]
      : []),
    { type: "verdict", variant: "full" },
    { type: "cover", headline: pickListenHeadline(stats) },
  ];
}

function pickLiveHeadline(stats: SpotifyLiveStats): CoverHeadline {
  const { repeat, plays } = stats.recent;
  if (repeat && repeat.count >= NOTABLE_REPEATS) {
    return { kind: "repeat", track: repeat.name, count: repeat.count, plays };
  }
  if (stats.dominant) return { kind: "dominant", ...stats.dominant };
  return { kind: "unknown" };
}

/** Shorter than the export's deck: the API has rankings and recent plays, but no totals. */
export function buildSpotifyLiveDeck(stats: SpotifyLiveStats): DeckSlide[] {
  const { recent, decade, dominant, monthFavourite } = stats;

  return [
    { type: "live_opening", artists: recent.artists, plays: recent.plays },
    ...(stats.topArtists.length > 0
      ? [{ type: "live_artists", artists: stats.topArtists } as const]
      : []),
    ...(stats.topTracks.length > 0
      ? [{ type: "live_tracks", tracks: stats.topTracks } as const]
      : []),
    ...(dominant ? [{ type: "live_dominant", ...dominant } as const] : []),
    ...(monthFavourite
      ? [
          {
            type: "live_month",
            favourite: monthFavourite,
            sameFavourite: stats.sameFavourite,
            newFaces: stats.newFaces,
            artists: stats.monthArtists,
          } as const,
        ]
      : []),
    ...(recent.repeat
      ? [
          {
            type: "live_repeat",
            track: recent.repeat.name,
            artist: recent.repeat.artist,
            count: recent.repeat.count,
            plays: recent.plays,
          } as const,
        ]
      : []),
    ...(decade && decade.share >= NOTABLE_DECADE_SHARE
      ? [{ type: "live_decade", ...decade } as const]
      : []),
    ...(stats.explicitShare >= NOTABLE_EXPLICIT_SHARE
      ? [{ type: "live_explicit", share: stats.explicitShare } as const]
      : []),
    { type: "verdict", variant: "full" },
    { type: "cover", headline: pickLiveHeadline(stats) },
  ];
}
