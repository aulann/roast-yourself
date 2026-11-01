"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  BacklogWaffle,
  ListeningClock,
  RankedGames,
  RankedNames,
  RankedTracks,
} from "@/components/deck/charts";
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

/** In characters; capitals take about a third more room, so they count for more. */
function longestWord(text: string) {
  const scale = text === text.toUpperCase() ? 1.35 : 1;
  return Math.max(...text.split(/\s+/).map((word) => word.length * scale));
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
  const width = text === text.toUpperCase() ? text.length * 1.35 : text.length;
  if (width <= MAX_STRUCK_LENGTH) {
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
    case "loop":
      return t("loop", { track: headline.track, run: headline.run });
    case "repeat":
      return t("repeat", {
        track: headline.track,
        count: headline.count,
        plays: headline.plays,
      });
    case "dominant":
      return t("dominant", {
        artist: headline.artist,
        count: headline.count,
        total: headline.total,
      });
    case "night":
      return t("night", {
        share: format.number(headline.share, { style: "percent" }),
      });
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
    case "listen_opening":
      return (
        <Page>
          <Kicker>{t("listen_opening.kicker")}</Kicker>
          <Title text={t("listen_opening.title")}>
            {t("listen_opening.title")}
          </Title>
          <div>
            <p className="font-serif text-[10cqw] leading-none italic">
              <Crossed text={copy.title ?? t("listen_opening.struck")} />
            </p>
            <HandNote rotate={-3} className="mt-[2cqw]">
              {copy.note ?? t("listen_opening.note")}
            </HandNote>
          </div>
          <Body delay={1}>
            {copy.body ??
              t("listen_opening.body", {
                plays: format.number(slide.plays),
                artists: format.number(slide.artists),
                fromYear: String(slide.fromYear),
                toYear: String(slide.toYear),
              })}
          </Body>
        </Page>
      );
    case "listen_hours":
      return (
        <Page>
          <Kicker>{t("listen_hours.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.hours)}
            unit={t("listen_hours.unit")}
          />
          <Body>
            {copy.body ?? t("listen_hours.body", { days: slide.days })}
          </Body>
          <HandNote className="self-end">
            {copy.note ?? t("listen_hours.note")}
          </HandNote>
        </Page>
      );
    case "listen_artist":
      return (
        <Page>
          <Kicker>{t("listen_artist.kicker")}</Kicker>
          <Title text={slide.artist}>{slide.artist}</Title>
          <Body>
            {copy.body ??
              t("listen_artist.body", {
                hours: format.number(slide.hours),
                plays: format.number(slide.plays),
                share: percent(slide.share),
              })}
          </Body>
          <HandNote rotate={3}>{copy.note ?? t("listen_artist.note")}</HandNote>
          <SlideSpray text={copy.spray ?? t("listen_artist.spray")} />
        </Page>
      );
    case "listen_tracks":
      return (
        <Page>
          <Kicker>{t("listen_tracks.kicker")}</Kicker>
          <Reveal delay={0.1}>
            <RankedTracks tracks={slide.tracks} />
          </Reveal>
          <HandNote delay={1.2}>{copy.note ?? t("listen_tracks.note")}</HandNote>
        </Page>
      );
    case "listen_clock": {
      const days = [0, 1, 2, 3, 4, 5, 6].map((day) =>
        t(`listen_clock.days.d${day}`),
      );
      const peakDay = days[slide.peakDay];
      return (
        <Page>
          <Kicker>{t("listen_clock.kicker")}</Kicker>
          <Reveal delay={0.1}>
            <ListeningClock
              cells={slide.cells}
              peakDay={slide.peakDay}
              peakHour={slide.peakHour}
              days={days}
              label={t("listen_clock.chartLabel", {
                day: peakDay,
                hour: slide.peakHour,
              })}
            />
          </Reveal>
          <Reveal delay={0.5}>
            <p className="font-mono text-[3.6cqw] uppercase tracking-widest">
              {t("listen_clock.peak", {
                day: peakDay,
                hour: String(slide.peakHour).padStart(2, "0"),
              })}
            </p>
          </Reveal>
          <HandNote delay={0.9}>{copy.note ?? t("listen_clock.note")}</HandNote>
        </Page>
      );
    }
    case "listen_night":
      return (
        <Page>
          <Kicker>{t("listen_night.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.hours)}
            unit={t("listen_night.unit")}
          />
          <Body>
            {copy.body ??
              t("listen_night.body", { share: percent(slide.share) })}
          </Body>
          <HandNote className="self-end">
            {copy.note ?? t("listen_night.note")}
          </HandNote>
        </Page>
      );
    case "listen_loop":
      return (
        <Page>
          <Kicker>{t("listen_loop.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.run)}
            unit={t("listen_loop.unit")}
          />
          <Body>
            {copy.body ??
              t("listen_loop.body", {
                track: slide.track,
                artist: slide.artist,
              })}
          </Body>
          <HandNote className="self-end">
            {copy.note ?? t("listen_loop.note")}
          </HandNote>
        </Page>
      );
    case "listen_skips":
      return (
        <Page>
          <Kicker>{t("listen_skips.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.count)}
            unit={t("listen_skips.unit")}
          />
          <Body>
            {copy.body ??
              t("listen_skips.body", { share: percent(slide.share) })}
          </Body>
          <HandNote>{copy.note ?? t("listen_skips.note")}</HandNote>
          <SlideSpray text={copy.spray ?? t("listen_skips.spray")} />
        </Page>
      );
    case "live_opening":
      return (
        <Page>
          <Kicker>{t("live_opening.kicker")}</Kicker>
          <Title text={t("live_opening.title")}>
            {t("live_opening.title")}
          </Title>
          <div>
            <p className="font-serif text-[10cqw] leading-none italic">
              <Crossed text={copy.title ?? t("live_opening.struck")} />
            </p>
            <HandNote rotate={-3} className="mt-[2cqw]">
              {copy.note ?? t("live_opening.note")}
            </HandNote>
          </div>
          <Body delay={1}>
            {copy.body ??
              t("live_opening.body", {
                artists: slide.artists,
                plays: slide.plays,
              })}
          </Body>
        </Page>
      );
    case "live_artists":
      return (
        <Page>
          <Kicker>{t("live_artists.kicker")}</Kicker>
          <Reveal delay={0.1}>
            <RankedNames items={slide.artists.map((name) => ({ name }))} />
          </Reveal>
          <HandNote delay={1.2}>{copy.note ?? t("live_artists.note")}</HandNote>
        </Page>
      );
    case "live_tracks":
      return (
        <Page>
          <Kicker>{t("live_tracks.kicker")}</Kicker>
          <Reveal delay={0.1}>
            <RankedNames
              items={slide.tracks.map((track) => ({
                name: track.name,
                detail: track.artist,
              }))}
            />
          </Reveal>
          <HandNote delay={1.2}>{copy.note ?? t("live_tracks.note")}</HandNote>
        </Page>
      );
    case "live_dominant":
      return (
        <Page>
          <Kicker>{t("live_dominant.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.count)}
            unit={t("live_dominant.unit", { total: slide.total })}
          />
          <Body>
            {copy.body ?? t("live_dominant.body", { artist: slide.artist })}
          </Body>
          <HandNote className="self-end">
            {copy.note ?? t("live_dominant.note")}
          </HandNote>
        </Page>
      );
    case "live_month":
      return (
        <Page>
          <Kicker>{t("live_month.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.newFaces)}
            unit={t("live_month.unit")}
          />
          <Body>
            {copy.body ??
              t(slide.sameFavourite ? "live_month.same" : "live_month.changed", {
                artist: slide.favourite,
              })}
          </Body>
          <HandNote className="self-end">
            {copy.note ?? t("live_month.note")}
          </HandNote>
        </Page>
      );
    case "live_repeat":
      return (
        <Page>
          <Kicker>{t("live_repeat.kicker")}</Kicker>
          <BigNumber
            value={format.number(slide.count)}
            unit={t("live_repeat.unit", { plays: slide.plays })}
          />
          <Body>
            {copy.body ??
              t("live_repeat.body", {
                track: slide.track,
                artist: slide.artist,
              })}
          </Body>
          <HandNote>{copy.note ?? t("live_repeat.note")}</HandNote>
          <SlideSpray text={copy.spray ?? t("live_repeat.spray")} />
        </Page>
      );
    case "live_decade":
      return (
        <Page>
          <Kicker>{t("live_decade.kicker")}</Kicker>
          <BigNumber
            value={percent(slide.share)}
            unit={t("live_decade.unit")}
          />
          <Body>
            {copy.body ??
              t("live_decade.body", { decade: String(slide.decade) })}
          </Body>
          <HandNote className="self-end">
            {copy.note ?? t("live_decade.note")}
          </HandNote>
        </Page>
      );
    case "live_explicit":
      return (
        <Page>
          <Kicker>{t("live_explicit.kicker")}</Kicker>
          <BigNumber
            value={percent(slide.share)}
            unit={t("live_explicit.unit")}
          />
          <Body>{copy.body ?? t("live_explicit.body")}</Body>
          <HandNote className="self-end">
            {copy.note ?? t("live_explicit.note")}
          </HandNote>
        </Page>
      );
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
                {slide.name
                  ? t("cover.exclusive", { name: slide.name })
                  : t("cover.exclusiveAnon")}
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
            className="right-0 bottom-[9cqw] leading-none"
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
