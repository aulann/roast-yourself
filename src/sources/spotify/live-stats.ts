const TOP_ITEMS = 5;
const MAX_NAME_LENGTH = 120;
const MIN_DOMINANT_TRACKS = 3;
const MIN_REPEATS = 3;
const NIGHT_END_HOUR = 5;

export type LibraryTrack = {
  name: string;
  artist: string;
  year: number | null;
  explicit: boolean;
};

/** What the API gives: rankings and recent plays, but no play counts or hours. */
export type SpotifyLibrary = {
  yearArtists: string[];
  yearTracks: LibraryTrack[];
  monthArtists: string[];
  monthTracks: LibraryTrack[];
  recent: (LibraryTrack & { playedAt: number })[];
};

export type LiveExclusions = { artists: string[]; tracks: string[] };

export type SpotifyLiveStats = {
  source: "spotify_live";
  schemaVersion: 1;
  topArtists: string[];
  topTracks: { name: string; artist: string }[];
  monthFavourite: string | null;
  sameFavourite: boolean;
  newFaces: number;
  monthArtists: number;
  dominant: { artist: string; count: number; total: number } | null;
  decade: { decade: number; share: number } | null;
  explicitShare: number;
  recent: {
    plays: number;
    artists: number;
    nightPlays: number;
    repeat: { name: string; artist: string; count: number } | null;
  };
};

function clean(value: string) {
  return value.trim().slice(0, MAX_NAME_LENGTH);
}

export function liveTrackKey(track: { name: string; artist: string }) {
  return `${track.artist}\u0000${track.name}`;
}

function mostCommon<T>(items: T[]) {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  let best: { item: T; count: number } | null = null;
  for (const [item, count] of counts) {
    if (!best || count > best.count) best = { item, count };
  }
  return best;
}

function isNight(timestamp: number, timeZone: string) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(timestamp);
  return Number(hour) < NIGHT_END_HOUR;
}

/** Null when an account has nothing to review yet. */
export function computeSpotifyLiveStats(
  library: SpotifyLibrary,
  timeZone: string,
  exclusions: LiveExclusions = { artists: [], tracks: [] },
): SpotifyLiveStats | null {
  const hiddenArtists = new Set(exclusions.artists);
  const hiddenTracks = new Set(exclusions.tracks);
  const keepTrack = <T extends LibraryTrack>(track: T) =>
    !hiddenArtists.has(track.artist) && !hiddenTracks.has(liveTrackKey(track));
  const keepArtist = (artist: string) => !hiddenArtists.has(artist);

  const yearArtists = library.yearArtists.filter(keepArtist);
  const yearTracks = library.yearTracks.filter(keepTrack);
  const monthArtists = library.monthArtists.filter(keepArtist);
  const recent = library.recent.filter(keepTrack);
  if (yearArtists.length === 0 && yearTracks.length === 0 && recent.length === 0) {
    return null;
  }

  const known = new Set(yearArtists);
  const dominant = mostCommon(yearTracks.map((track) => track.artist));
  const years = yearTracks.flatMap((track) => (track.year ? [track.year] : []));
  const decade = mostCommon(years.map((year) => Math.floor(year / 10) * 10));
  const repeat = mostCommon(recent.map(liveTrackKey));
  const repeated =
    repeat && repeat.count >= MIN_REPEATS
      ? recent.find((track) => liveTrackKey(track) === repeat.item)
      : undefined;

  return {
    source: "spotify_live",
    schemaVersion: 1,
    topArtists: yearArtists.slice(0, TOP_ITEMS).map(clean),
    topTracks: yearTracks.slice(0, TOP_ITEMS).map((track) => ({
      name: clean(track.name),
      artist: clean(track.artist),
    })),
    monthFavourite: monthArtists[0] ? clean(monthArtists[0]) : null,
    sameFavourite: Boolean(monthArtists[0]) && monthArtists[0] === yearArtists[0],
    newFaces: monthArtists.filter((artist) => !known.has(artist)).length,
    monthArtists: monthArtists.length,
    dominant:
      dominant && dominant.count >= MIN_DOMINANT_TRACKS
        ? {
            artist: clean(dominant.item),
            count: dominant.count,
            total: yearTracks.length,
          }
        : null,
    decade: decade
      ? { decade: decade.item, share: decade.count / years.length }
      : null,
    explicitShare:
      yearTracks.length > 0
        ? yearTracks.filter((track) => track.explicit).length / yearTracks.length
        : 0,
    recent: {
      plays: recent.length,
      artists: new Set(recent.map((track) => track.artist)).size,
      nightPlays: recent.filter((track) => isNight(track.playedAt, timeZone))
        .length,
      repeat:
        repeated && repeat
          ? {
              name: clean(repeated.name),
              artist: clean(repeated.artist),
              count: repeat.count,
            }
          : null,
    },
  };
}
