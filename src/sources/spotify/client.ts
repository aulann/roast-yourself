import { z } from "zod";
import type { SpotifyLibrary } from "./live-stats";

const API_ROOT = "https://api.spotify.com/v1";
const PAGE_SIZE = "50";

const artistSchema = z.object({ name: z.string() });

// Spotify is removing fields from its API, so only names are required.
const trackSchema = z.object({
  name: z.string(),
  artists: z.array(artistSchema).min(1),
  explicit: z.boolean().optional(),
  album: z.object({ release_date: z.string().optional() }).optional(),
});

const topArtistsSchema = z.object({ items: z.array(artistSchema) });
const topTracksSchema = z.object({ items: z.array(trackSchema) });
const recentSchema = z.object({
  items: z.array(z.object({ track: trackSchema, played_at: z.string() })),
});

export type SpotifyResult =
  | { status: "ok"; library: SpotifyLibrary }
  | { status: "expired" | "not_allowed" };

class SpotifyStatusError extends Error {
  constructor(readonly status: number) {
    super(`Spotify API returned ${status}`);
  }
}

function toTrack(track: z.infer<typeof trackSchema>) {
  const year = Number(track.album?.release_date?.slice(0, 4));
  return {
    name: track.name,
    artist: track.artists[0].name,
    year: Number.isFinite(year) && year > 0 ? year : null,
    explicit: track.explicit ?? false,
  };
}

export async function fetchSpotifyLibrary(
  accessToken: string,
  fetchFn: typeof fetch = fetch,
): Promise<SpotifyResult> {
  async function call(path: string, params: Record<string, string>) {
    const query = new URLSearchParams({ limit: PAGE_SIZE, ...params });
    const response = await fetchFn(`${API_ROOT}${path}?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new SpotifyStatusError(response.status);
    return response.json();
  }

  try {
    const [yearArtists, yearTracks, monthArtists, monthTracks, recent] =
      await Promise.all([
        call("/me/top/artists", { time_range: "long_term" }),
        call("/me/top/tracks", { time_range: "long_term" }),
        call("/me/top/artists", { time_range: "short_term" }),
        call("/me/top/tracks", { time_range: "short_term" }),
        call("/me/player/recently-played", {}),
      ]);

    return {
      status: "ok",
      library: {
        yearArtists: topArtistsSchema
          .parse(yearArtists)
          .items.map((artist) => artist.name),
        yearTracks: topTracksSchema.parse(yearTracks).items.map(toTrack),
        monthArtists: topArtistsSchema
          .parse(monthArtists)
          .items.map((artist) => artist.name),
        monthTracks: topTracksSchema.parse(monthTracks).items.map(toTrack),
        recent: recentSchema.parse(recent).items.map((item) => ({
          ...toTrack(item.track),
          playedAt: Date.parse(item.played_at),
        })),
      },
    };
  } catch (error) {
    if (error instanceof SpotifyStatusError) {
      if (error.status === 401) return { status: "expired" };
      // Development mode answers 403 for accounts missing from the app's user list.
      if (error.status === 403) return { status: "not_allowed" };
    }
    throw error;
  }
}
