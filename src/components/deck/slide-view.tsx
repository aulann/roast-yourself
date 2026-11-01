"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BacklogWaffle, RankedGames } from "@/components/deck/charts";
import {
  Clipping,
  HandNote,
  Reveal,
  Spray,
  Struck,
} from "@/components/deck/vandal";
import type { SlideCopy } from "@/roast/copy";
import type { CoverHeadline, DeckSlide } from "@/roast/deck";

const BUSY_RECENT_HOURS = 40;
const MAX_STRUCK_LENGTH = 18;

function longestWord(text: string) {
  return Math.max(...text.split(/\s+/).map((word) => word.length));
}

function titleSize(text: string) {
  if (text.length > 40 || longestWord(text) > 13) return "text-[9.5cqw]";
  if (longestWord(text) > 9) return "text-[12cqw]";
  if (text.length > 18) return "text-[13cqw]";
  return "text-[17cqw]";
}

function coverTitleSize(text: string) {
  if (text.length > 40 || longestWord(text) > 11) return "text-[9.5cqw]";
  if (text.length > 28) return "text-[11.5cqw]";
  return "text-[13.5cqw]";
}

/** A short text gets the animated pen stroke; a longer one wraps, so each line is crossed out. */
function Crossed({ text, delay }: { text: string; delay?: number }) {
  if (text.length <= MAX_STRUCK_LENGTH) {
    return <Struck delay={delay}>{text}</Struck>;
  }
  return (
    <span className="line-through decoration-vandal decoration-2">{text}</span>
  );
}

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col justify-center gap-[6cqw]">
      {children}
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <Reveal>
      <p className="border-l-2 border-vandal pl-[2.5cqw] font-mono text-[3.2cqw] uppercase tracking-[0.2em] text-muted">
        {children}
      </p>
    </Reveal>
  );
}

function Title({ children, text }: { children: ReactNode; text: string }) {
  return (
    <Reveal delay={0.1}>
      <h2
        className={`font-serif leading-[0.92] tracking-tight break-words ${titleSize(text)}`}
      >
        {children}
      </h2>
    </Reveal>
  );
}

function Body({
  children,
  delay = 0.3,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <p className="text-[5.4cqw] leading-snug text-paper/90">{children}</p>
    </Reveal>
  );
}

function BigNumber({ value, unit }: { value: string; unit: string }) {
  const size = value.length > 5 ? "text-[21cqw]" : "text-[30cqw]";

  return (
    <Clipping>
      <p className={`font-mono leading-none font-bold tracking-tighter ${size}`}>
        {value}
      </p>
      <p className="mt-[1.5cqw] font-mono text-[3.6cqw] uppercase tracking-widest">
        {unit}
      </p>
    </Clipping>
  );
}

function spraySize(text: string, largest: number) {
  // Spray letters are about 0.45em wide, and the text has to stay inside the frame.
  return `${Math.min(largest, Math.floor(82 / (text.length * 0.45)))}cqw`;
}

function SlideSpray({ text }: { text: string }) {
  return (
    <Spray
      className="right-[4cqw] bottom-[13cqw] leading-none"
      style={{ fontSize: spraySize(text, 21) }}
    >
      {text}
    </Spray>
  );
}

function CoverTitle({ headline }: { headline: CoverHeadline }) {
  const t = useTranslations("deck.cover");
  const format = useFormatter();

  switch (headline.kind) {
    case "backlog":
      return t("backlog", {
        share: format.number(headline.share, { style: "percent" }),
      });
    case "obsession":
      return t("obsession", { game: headline.game, hours: headline.hours });
    case "hours":
      return t("hours", { hours: headline.hours });
    case "unknown":
      return t("unknown");
  }
}

export function SlideView({
  slide,
  copy = {},
}: {
  slide: DeckSlide;
  copy?: SlideCopy;
}) {
  const t = useTranslations("deck");
  const format = useFormatter();
  const percent = (value: number) => format.number(value, { style: "percent" });

  switch (slide.type) {
    case "opening":
      return (
        <Page>
          <Kicker>{t("opening.kicker")}</Kicker>
          <Title text={slide.name}>{slide.name}</Title>
          <div>
            <p className="font-serif text-[10cqw] leading-none italic">
              <Crossed text={copy.title ?? t("opening.struck")} />
            </p>
            <HandNote rotate={-3} className="mt-[2cqw]">
              {copy.note ?? t("opening.note")}
            </HandNote>
          </div>
          <Body delay={1}>{copy.body ?? t("opening.body", { games: slide.games })}</Body>
        </Page>
      );
    case "hours":
      return (
        <Page>
          <Kicker>{t("hours.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.hours)}
            unit={t("hours.unit")}
          />
          <Body>{copy.body ?? t("hours.body", { days: slide.days })}</Body>
          <HandNote className="self-end">{copy.note ?? t("hours.note")}</HandNote>
        </Page>
      );
    case "suspect":
      return (
        <Page>
          <Kicker>{t("suspect.kicker")}</Kicker>
          <Title text={slide.game.name}>{slide.game.name}</Title>
          <Body>
            {copy.body ??
              t("suspect.body", {
                hours: slide.game.hours,
                share: percent(slide.game.share),
              })}
          </Body>
          <HandNote rotate={3}>{copy.note ?? t("suspect.note")}</HandNote>
          <SlideSpray text={copy.spray ?? t("suspect.spray")} />
        </Page>
      );
    case "ranking":
      return (
        <Page>
          <Kicker>{t("ranking.kicker")}</Kicker>
          <Reveal delay={0.1}>
            <RankedGames games={slide.games} />
          </Reveal>
          <HandNote delay={1.2}>{copy.note ?? t("ranking.note")}</HandNote>
        </Page>
      );
    case "backlog": {
      const share = percent(slide.share);
      return (
        <Page>
          <Kicker>{t("backlog.kicker")}</Kicker>
          <div className="relative">
            <BacklogWaffle
              share={slide.share}
              label={t("backlog.chartLabel", { share })}
            />
            <Spray className="top-[16cqw] left-[12cqw] text-[42cqw] leading-none">
              {share}
            </Spray>
          </div>
          <Body delay={0.6}>
            {copy.body ??
              t("backlog.body", {
                neverPlayed: slide.neverPlayed,
                total: slide.total,
              })}
          </Body>
          <HandNote delay={1.1} rotate={2}>
            {copy.note ?? t("backlog.note")}
          </HandNote>
        </Page>
      );
    }
    case "dropped":
      return (
        <Page>
          <Kicker>{t("dropped.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.count)}
            unit={t("dropped.unit", { count: slide.count })}
          />
          <Body>{copy.body ?? t("dropped.body")}</Body>
          <HandNote className="self-end">{copy.note ?? t("dropped.note")}</HandNote>
          <SlideSpray text={copy.spray ?? t("dropped.spray")} />
        </Page>
      );
    case "abandoned":
      return (
        <Page>
          <Kicker>{t("abandoned.kicker")}</Kicker>
          <Title text={slide.game}>
            <Crossed text={slide.game} />
          </Title>
          <Body delay={0.7}>
            {copy.body ??
              t("abandoned.body", { hours: slide.hours, years: slide.years })}
          </Body>
          <HandNote delay={1}>{copy.note ?? t("abandoned.note")}</HandNote>
        </Page>
      );
    case "recent": {
      const note =
        slide.hours === 0
          ? t("recent.noteIdle")
          : slide.hours >= BUSY_RECENT_HOURS
            ? t("recent.noteBusy")
            : t("recent.noteMild");
      return (
        <Page>
          <Kicker>{t("recent.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.hours)}
            unit={t("recent.unit")}
          />
          <HandNote className="self-end">{copy.note ?? note}</HandNote>
          <SlideSpray text={copy.spray ?? t("recent.spray")} />
        </Page>
      );
    }
    case "verdict": {
      const title = copy.title ?? t(`verdict.${slide.variant}.title`);
      return (
        <Page>
          <Kicker>{t("verdict.kicker")}</Kicker>
          <Title text={title}>{title}</Title>
          <Body>{copy.body ?? t(`verdict.${slide.variant}.body`)}</Body>
          <HandNote className="self-end text-[13cqw]" delay={0.9}>
            {t("verdict.signature")}
          </HandNote>
        </Page>
      );
    }
    case "cover": {
      const spray = copy.spray ?? t("cover.spray");
      return (
        <div className="relative flex h-full flex-col">
          <Reveal>
            <h2 className="text-center font-serif text-[24.5cqw] leading-[0.85] font-black tracking-tight uppercase">
              {t("cover.masthead")}
            </h2>
            <p className="mt-[1cqw] text-center font-mono text-[3.4cqw] uppercase tracking-[0.75em]">
              {t("cover.mastheadLine")}
            </p>
            <p className="mt-[3cqw] flex justify-between gap-[3cqw] border-y border-paper/40 py-[1.2cqw] font-mono text-[2.6cqw] uppercase tracking-widest text-muted">
              <span className="shrink-0">{t("cover.issue")}</span>
              <span className="truncate">
                {t("cover.exclusive", { name: slide.name })}
              </span>
            </p>
          </Reveal>
          <div className="mt-[10cqw] flex flex-col gap-[5cqw]">
            <Reveal delay={0.2}>
              <p
                className={`font-serif leading-[0.95] tracking-tight break-words italic ${coverTitleSize(copy.title ?? "")}`}
              >
                {copy.title ?? <CoverTitle headline={slide.headline} />}
              </p>
            </Reveal>
            <HandNote delay={1.1}>{copy.note ?? t("cover.note")}</HandNote>
          </div>
          <Spray
            className="right-0 bottom-[7cqw] leading-none"
            style={{ fontSize: spraySize(spray, 24) }}
          >
            {spray}
          </Spray>
          <p className="mt-auto font-mono text-[2.4cqw] leading-tight text-muted">
            {t("cover.disclaimer")}
          </p>
        </div>
      );
    }
  }
}
