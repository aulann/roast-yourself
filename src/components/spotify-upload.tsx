"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { RoastControls } from "@/components/roast-controls";
import type {
  WorkerRequest,
  WorkerResponse,
} from "@/sources/spotify/parse.worker";
import { trackKey, type Exclusions, type SpotifyStats } from "@/sources/spotify/stats";

const NO_EXCLUSIONS: Exclusions = { artists: [], tracks: [] };

export function SpotifyUpload() {
  const t = useTranslations("spotify");
  const tForm = useTranslations("roastForm");
  const format = useFormatter();
  const worker = useRef<Worker | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SpotifyStats | null>(null);
  const [exclusions, setExclusions] = useState(NO_EXCLUSIONS);

  useEffect(() => {
    const instance = new Worker(
      new URL("../sources/spotify/parse.worker.ts", import.meta.url),
    );
    instance.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      setParsing(false);
      if (data.type === "error") setError(data.code);
      else setStats(data.stats);
    };
    instance.onerror = () => {
      setParsing(false);
      setError("invalid");
    };
    worker.current = instance;
    return () => instance.terminate();
  }, []);

  function send(message: WorkerRequest) {
    worker.current?.postMessage(message);
  }

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setStats(null);
    setExclusions(NO_EXCLUSIONS);
    setParsing(true);
    send({
      type: "parse",
      files: [...files],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  function exclude(next: Exclusions) {
    setExclusions(next);
    send({ type: "exclude", exclusions: next });
  }

  const excludedCount = exclusions.artists.length + exclusions.tracks.length;

  return (
    <div className="flex flex-col gap-6">
      <label className="flex max-w-xl cursor-pointer flex-col gap-2 border border-dashed border-paper/40 p-6 focus-within:border-paper">
        <span className="font-serif text-2xl">{t("drop")}</span>
        <span className="text-sm text-muted">{t("dropHint")}</span>
        <input
          type="file"
          multiple
          accept=".zip,.json"
          aria-label={t("drop")}
          onChange={(event) => upload(event.target.files)}
          className="mt-2 text-sm"
        />
      </label>

      {parsing && (
        <p role="status" className="font-hand text-3xl text-vandal">
          {t("parsing")}
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-xl text-vandal">
          {t(`errors.${error}`)}
        </p>
      )}

      {stats && (
        <>
          <dl className="grid max-w-xl grid-cols-[1fr_auto] gap-x-8 gap-y-2">
            {[
              [t("stats.hours"), format.number(Math.round(stats.totalMinutes / 60))],
              [t("stats.plays"), format.number(stats.plays)],
              [t("stats.artists"), format.number(stats.artists)],
              [t("stats.years"), `${stats.firstYear}–${stats.lastYear}`],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-mono">{value}</dd>
              </div>
            ))}
          </dl>

          <RoastControls
            endpoint="/api/roast/spotify"
            body={{ stats }}
            disclosure={t("disclosure")}
          >
            <div className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
                {t("titlesHeading")}
              </h3>
              <p className="text-sm text-muted">{t("titlesLead")}</p>
              <ul className="divide-y divide-paper/10">
                {stats.topArtists.map((artist) => (
                  <li
                    key={artist.name}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <span className="min-w-0 truncate">{artist.name}</span>
                    <button
                      type="button"
                      aria-label={`${tForm("exclude")}: ${artist.name}`}
                      onClick={() =>
                        exclude({
                          ...exclusions,
                          artists: [...exclusions.artists, artist.name],
                        })
                      }
                      className="shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-widest text-muted underline"
                    >
                      {tForm("exclude")}
                    </button>
                  </li>
                ))}
                {stats.topTracks.map((track) => (
                  <li
                    key={trackKey({ artist: track.artist, track: track.name })}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <span className="min-w-0 truncate">
                      {track.name}
                      <span className="ml-2 text-sm text-muted">
                        {track.artist}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`${tForm("exclude")}: ${track.name}`}
                      onClick={() =>
                        exclude({
                          ...exclusions,
                          tracks: [
                            ...exclusions.tracks,
                            trackKey({ artist: track.artist, track: track.name }),
                          ],
                        })
                      }
                      className="shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-widest text-muted underline"
                    >
                      {tForm("exclude")}
                    </button>
                  </li>
                ))}
              </ul>
              {excludedCount > 0 && (
                <button
                  type="button"
                  onClick={() => exclude(NO_EXCLUSIONS)}
                  className="self-start font-mono text-xs uppercase tracking-widest text-muted underline"
                >
                  {tForm("restore", { count: excludedCount })}
                </button>
              )}
            </div>
          </RoastControls>
        </>
      )}

      {!stats && !parsing && excludedCount > 0 && (
        <button
          type="button"
          onClick={() => exclude(NO_EXCLUSIONS)}
          className="self-start font-mono text-xs uppercase tracking-widest text-muted underline"
        >
          {tForm("restore", { count: excludedCount })}
        </button>
      )}
    </div>
  );
}
