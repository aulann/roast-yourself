"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { RoastControls } from "@/components/roast-controls";
import type { SteamGame } from "@/sources/steam/client";
import { computeSteamStats, gameName } from "@/sources/steam/stats";

/** Shows exactly which titles the model will read, so anyone can remove them first. */
export function RoastForm({
  games,
  nowSeconds,
}: {
  games: SteamGame[];
  nowSeconds: number;
}) {
  const t = useTranslations("roastForm");
  const [excluded, setExcluded] = useState<SteamGame[]>([]);

  const visibleTitles = useMemo(() => {
    const ids = new Set(excluded.map((game) => game.appid));
    const { playtime } = computeSteamStats(
      games.filter((game) => !ids.has(game.appid)),
      nowSeconds,
    );
    if (!playtime) return [];

    const names = new Set([
      ...playtime.topGames.map((game) => game.name),
      ...playtime.unplayedSample,
      ...(playtime.abandoned ? [playtime.abandoned.name] : []),
    ]);
    return games.filter(
      (game) => !ids.has(game.appid) && names.has(gameName(game)),
    );
  }, [games, excluded, nowSeconds]);

  return (
    <RoastControls
      endpoint="/api/roast/steam"
      body={{ excludedAppIds: excluded.map((game) => game.appid) }}
      disclosure={t("disclosure")}
    >
      <div className="flex flex-col gap-2">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">
          {t("titlesHeading")}
        </h3>
        <p className="text-sm text-muted">{t("titlesLead")}</p>
        <ul className="divide-y divide-paper/10">
          {visibleTitles.map((game) => (
            <li
              key={game.appid}
              className="flex items-center justify-between gap-4 py-1"
            >
              <span className="min-w-0 truncate">{gameName(game)}</span>
              <button
                type="button"
                onClick={() => setExcluded((list) => [...list, game])}
                className="shrink-0 px-2 py-1 font-mono text-xs uppercase tracking-widest text-muted underline"
              >
                {t("exclude")}
              </button>
            </li>
          ))}
        </ul>
        {excluded.length > 0 && (
          <button
            type="button"
            onClick={() => setExcluded([])}
            className="self-start font-mono text-xs uppercase tracking-widest text-muted underline"
          >
            {t("restore", { count: excluded.length })}
          </button>
        )}
      </div>
    </RoastControls>
  );
}
