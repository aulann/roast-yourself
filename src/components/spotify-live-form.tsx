"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { RoastControls } from "@/components/roast-controls";
import {
  computeSpotifyLiveStats,
  liveTrackKey,
  type SpotifyLibrary,
} from "@/sources/spotify/live-stats";

const BUTTON =
  "shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-widest text-muted underline";

/** Previews the names on this device, while the server recomputes everything from Spotify's data. */
export function SpotifyLiveForm({
  library,
  timeZoneFallback,
}: {
  library: SpotifyLibrary;
  timeZoneFallback: string;
}) {
  const t = useTranslations("spotify");
  const tForm = useTranslations("roastForm");
  const [artists, setArtists] = useState<string[]>([]);
  const [tracks, setTracks] = useState<string[]>([]);
  const [timeZone] = useState(() =>
    typeof Intl === "undefined"
      ? timeZoneFallback
      : Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  const stats = useMemo(
    () => computeSpotifyLiveStats(library, timeZone, { artists, tracks }),
    [library, timeZone, artists, tracks],
  );
  const excludedCount = artists.length + tracks.length;

  const restore = excludedCount > 0 && (
    <button
      type="button"
      onClick={() => {
        setArtists([]);
        setTracks([]);
      }}
      className="self-start font-mono text-xs uppercase tracking-widest text-muted underline"
    >
      {tForm("restore", { count: excludedCount })}
    </button>
  );

  if (!stats) {
    return (
      <div className="flex flex-col gap-3">
        <p className="max-w-xl text-muted">{t("live.empty")}</p>
        {restore}
      </div>
    );
  }

  return (
    <RoastControls
      endpoint="/api/roast/spotify-live"
      body={{ timeZone, excludedArtists: artists, excludedTracks: tracks }}
      disclosure={t("live.disclosure")}
    >
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
          {t("titlesHeading")}
        </h3>
        <p className="text-sm text-muted">{t("titlesLead")}</p>
        <ul className="divide-y divide-paper/10">
          {stats.topArtists.map((artist) => (
            <li
              key={artist}
              className="flex items-center justify-between gap-4 py-1"
            >
              <span className="min-w-0 truncate">{artist}</span>
              <button
                type="button"
                aria-label={`${tForm("exclude")}: ${artist}`}
                onClick={() => setArtists((list) => [...list, artist])}
                className={BUTTON}
              >
                {tForm("exclude")}
              </button>
            </li>
          ))}
          {stats.topTracks.map((track) => (
            <li
              key={liveTrackKey(track)}
              className="flex items-center justify-between gap-4 py-1"
            >
              <span className="min-w-0 truncate">
                {track.name}
                <span className="ml-2 text-sm text-muted">{track.artist}</span>
              </span>
              <button
                type="button"
                aria-label={`${tForm("exclude")}: ${track.name}`}
                onClick={() =>
                  setTracks((list) => [...list, liveTrackKey(track)])
                }
                className={BUTTON}
              >
                {tForm("exclude")}
              </button>
            </li>
          ))}
        </ul>
        {restore}
      </div>
    </RoastControls>
  );
}
