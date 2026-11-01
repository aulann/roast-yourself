"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { HEAT_LEVELS, type Heat, type RoastLocale } from "@/roast/prompt";

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

/** The steps shared by every source: heat, language, what gets sent, and sending it. */
export function RoastControls({
  endpoint,
  body,
  disclosure,
  children,
}: {
  endpoint: string;
  body: object;
  disclosure: string;
  children: ReactNode;
}) {
  const t = useTranslations("roastForm");
  const pageLocale = useLocale();
  const router = useRouter();
  const [heat, setHeat] = useState<Heat>("spicy");
  const [locale, setLocale] = useState(pageLocale as RoastLocale);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, heat, locale }),
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

      {children}

      <p className="text-sm text-muted">{disclosure}</p>

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
