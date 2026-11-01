"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { HEAT_LEVELS, type Heat, type RoastLocale } from "@/roast/prompt";
import type { SteamGame } from "@/sources/steam/client";
import { computeSteamStats, gameName } from "@/sources/steam/stats";

const WAITING_LINES = 4;
const WAITING_LINE_MS = 3500;

function WaitingScreen() {
  const t = useTranslations("roastForm.waiting");
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setLine((current) => (current + 1) % WAITING_LINES),
      WAITING_LINE_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink px-6"
    >
      <p className="max-w-md -rotate-2 text-center font-hand text-4xl text-vandal">
        {t(`line${line}`)}
      </p>
    </div>
  );
}

/** Shows exactly which titles the model will read, so anyone can remove them first. */
export function RoastForm({
  games,
  nowSeconds,
}: {
  games: SteamGame[];
  nowSeconds: number;
}) {
  const t = useTranslations("roastForm");
  const pageLocale = useLocale();
  const router = useRouter();
  const [heat, setHeat] = useState<Heat>("spicy");
  const [locale, setLocale] = useState(pageLocale as RoastLocale);
  const [excluded, setExcluded] = useState<SteamGame[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function submit() {
    setSending(true);
    setError(null);
    const response = await fetch("/api/roast/steam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heat,
        locale,
        excludedAppIds: excluded.map((game) => game.appid),
      }),
    }).catch(() => null);

    const result = response ? await response.json().catch(() => null) : null;
    if (result?.id) {
      router.push(`/roast/${result.id}`, { locale });
      return;
    }
    setSending(false);
    setError(result?.error ?? "failed");
  }

  return (
    <section className="flex max-w-xl flex-col gap-6 border-t border-paper/20 pt-6">
      {sending && <WaitingScreen />}
      <h2 className="font-serif text-3xl">{t("title")}</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          {t("heat")}
        </legend>
        {HEAT_LEVELS.map((level) => (
          <label key={level} className="flex items-baseline gap-3">
            <input
              type="radio"
              name="heat"
              checked={heat === level}
              onChange={() => setHeat(level)}
              className="accent-vandal"
            />
            <span>
              {t(`heatLevels.${level}.label`)}
              <span className="ml-2 text-sm text-muted">
                {t(`heatLevels.${level}.hint`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex gap-4">
        <legend className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          {t("language")}
        </legend>
        {(["pl", "en"] as const).map((option) => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="radio"
              name="language"
              checked={locale === option}
              onChange={() => setLocale(option)}
              className="accent-vandal"
            />
            {t(`languages.${option}`)}
          </label>
        ))}
      </fieldset>

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

      <p className="text-sm text-muted">{t("disclosure")}</p>

      {error && (
        <p role="alert" className="text-vandal">
          {t.has(`errors.${error}`) ? t(`errors.${error}`) : t("errors.failed")}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={sending}
        className="self-start bg-vandal px-4 py-3 font-mono text-xs uppercase tracking-widest text-paper disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </section>
  );
}
