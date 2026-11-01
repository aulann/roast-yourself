import { z } from "zod";
import type { Play } from "./parse";

const TOP_ITEMS = 5;
const MAX_NAME_LENGTH = 120;
const COUNTED_PLAY_MS = 30_000;
const NIGHT_END_HOUR = 5;
const MIN_LOOP_RUN = 3;
const TIME_BUCKET_MS = 15 * 60 * 1000;

const name = z
  .string()
  .transform((value) => value.replace(/[\u0000-\u001f]/g, " ").trim())
  .pipe(z.string().min(1).max(MAX_NAME_LENGTH));
const count = z.number().int().nonnegative();
const minutes = z.number().nonnegative().finite();
const share = z.number().min(0).max(1);
const track = z.object({ name, artist: name });

/** The browser computes the stats, so the server must treat them as untrusted input. */
export const spotifyStatsSchema = z.object({
  source: z.literal("spotify"),
  schemaVersion: z.literal(1),
  firstYear: count,
  lastYear: count,
  totalMinutes: minutes,
  plays: count,
  artists: count,
  topArtists: z
    .array(z.object({ name, minutes, plays: count }))
    .min(1)
    .max(TOP_ITEMS),
  topArtistShare: share,
  topTracks: z
    .array(track.extend({ minutes, plays: count }))
    .min(1)
    .max(TOP_ITEMS),
  heatmap: z.array(z.array(minutes).length(24)).length(7),
  peak: z.object({ day: count.max(6), hour: count.max(23) }),
  nightMinutes: minutes,
  nightShare: share,
  loop: track.extend({ run: count }).nullable(),
  skips: z.object({ count, share }).nullable(),
});

export type SpotifyStats = z.infer<typeof spotifyStatsSchema>;
export type Exclusions = { artists: string[]; tracks: string[] };

type LoopRun = { key: string; run: number; play: Play };

function clean(value: string) {
  return value.slice(0, MAX_NAME_LENGTH);
}

function trackKey(play: Pick<Play, "artist" | "track">) {
  return `${play.artist}\u0000${play.track}`;
}

function localTime(timeZone: string) {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    year: "numeric",
    hourCycle: "h23",
  });
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Formatting dates is slow and histories are long, so nearby plays share a result.
  const cache = new Map<number, { day: number; hour: number; year: number }>();

  return (timestamp: number) => {
    const bucket = Math.floor(timestamp / TIME_BUCKET_MS);
    const cached = cache.get(bucket);
    if (cached) return cached;

    const parts = format.formatToParts(timestamp);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "";
    const result = {
      day: days.indexOf(part("weekday")),
      hour: Number(part("hour")),
      year: Number(part("year")),
    };
    cache.set(bucket, result);
    return result;
  };
}

function top<T>(items: Iterable<T>, value: (item: T) => number) {
  return [...items].sort((a, b) => value(b) - value(a)).slice(0, TOP_ITEMS);
}

/** Null when nothing is left to review, for example after excluding every artist. */
export function computeSpotifyStats(
  allPlays: Play[],
  timeZone: string,
  exclusions: Exclusions = { artists: [], tracks: [] },
): SpotifyStats | null {
  const excludedArtists = new Set(exclusions.artists);
  const excludedTracks = new Set(exclusions.tracks);
  const plays = allPlays
    .filter(
      (play) =>
        !excludedArtists.has(play.artist) &&
        !excludedTracks.has(trackKey(play)),
    )
    .sort((a, b) => a.endedAt - b.endedAt);
  if (plays.length === 0) return null;

  const toLocal = localTime(timeZone);
  const artists = new Map<
    string,
    { name: string; minutes: number; plays: number }
  >();
  const tracks = new Map<
    string,
    { name: string; artist: string; minutes: number; plays: number }
  >();
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  let totalMinutes = 0;
  let countedPlays = 0;
  let nightMinutes = 0;
  let firstYear = Infinity;
  let lastYear = 0;
  let skipped = 0;
  let skipKnown = 0;
  let loop = null as LoopRun | null;
  let current = null as LoopRun | null;

  for (const play of plays) {
    const playMinutes = play.ms / 60_000;
    const counted = play.ms >= COUNTED_PLAY_MS;
    const key = trackKey(play);
    const { day, hour, year } = toLocal(play.endedAt);

    totalMinutes += playMinutes;
    heatmap[day][hour] += playMinutes;
    if (hour < NIGHT_END_HOUR) nightMinutes += playMinutes;
    firstYear = Math.min(firstYear, year);
    lastYear = Math.max(lastYear, year);
    if (counted) countedPlays += 1;

    const artist = artists.get(play.artist) ?? {
      name: clean(play.artist),
      minutes: 0,
      plays: 0,
    };
    artist.minutes += playMinutes;
    if (counted) artist.plays += 1;
    artists.set(play.artist, artist);

    const trackStats = tracks.get(key) ?? {
      name: clean(play.track),
      artist: clean(play.artist),
      minutes: 0,
      plays: 0,
    };
    trackStats.minutes += playMinutes;
    if (counted) trackStats.plays += 1;
    tracks.set(key, trackStats);

    if (play.skipped !== null) {
      skipKnown += 1;
      if (play.skipped) skipped += 1;
    }

    // Very short plays do not break a loop: skipping away and back is still obsessing.
    if (counted) {
      current =
        current?.key === key
          ? { ...current, run: current.run + 1 }
          : { key, run: 1, play };
      if (current.run > (loop?.run ?? 0)) loop = current;
    }
  }

  const topArtists = top(artists.values(), (item) => item.minutes);
  let peak = { day: 0, hour: 0 };
  heatmap.forEach((hours, day) =>
    hours.forEach((value, hour) => {
      if (value > heatmap[peak.day][peak.hour]) peak = { day, hour };
    }),
  );

  return {
    source: "spotify",
    schemaVersion: 1,
    firstYear,
    lastYear,
    totalMinutes,
    plays: countedPlays,
    artists: artists.size,
    topArtists,
    topArtistShare: topArtists[0].minutes / totalMinutes,
    topTracks: top(tracks.values(), (item) => item.plays),
    heatmap,
    peak,
    nightMinutes,
    nightShare: nightMinutes / totalMinutes,
    loop:
      loop && loop.run >= MIN_LOOP_RUN
        ? {
            name: clean(loop.play.track),
            artist: clean(loop.play.artist),
            run: loop.run,
          }
        : null,
    skips: skipKnown > 0 ? { count: skipped, share: skipped / skipKnown } : null,
  };
}

export { trackKey };
