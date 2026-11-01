import { z } from "zod";
import type { DeckSlide } from "./deck";

export const COPY_LIMITS = { title: 60, body: 170, note: 44, spray: 10 };

// Models count characters badly. The prompt asks for the limit, but slides have room for a bit more.
const LIMIT_TOLERANCE = 1.25;

type CopyField = keyof typeof COPY_LIMITS;

/** Which texts the model writes for each slide; everything else on a slide comes from code. */
export const COPY_FIELDS: Record<DeckSlide["type"], CopyField[]> = {
  opening: ["title", "note", "body"],
  hours: ["body", "note"],
  suspect: ["body", "note", "spray"],
  ranking: ["note"],
  backlog: ["body", "note"],
  dropped: ["body", "note", "spray"],
  abandoned: ["body", "note"],
  recent: ["note", "spray"],
  listen_opening: ["title", "note", "body"],
  listen_hours: ["body", "note"],
  listen_artist: ["body", "note", "spray"],
  listen_tracks: ["note"],
  listen_clock: ["note"],
  listen_night: ["body", "note"],
  listen_loop: ["body", "note"],
  listen_skips: ["body", "note", "spray"],
  live_opening: ["title", "note", "body"],
  live_artists: ["note"],
  live_tracks: ["note"],
  live_dominant: ["body", "note"],
  live_month: ["body", "note"],
  live_repeat: ["body", "note", "spray"],
  live_decade: ["body", "note"],
  live_explicit: ["body", "note"],
  verdict: ["title", "body"],
  cover: ["title", "note", "spray"],
};

const SLIDE_TYPES = Object.keys(COPY_FIELDS) as [
  DeckSlide["type"],
  ...DeckSlide["type"][],
];

export const roastOutputSchema = z.object({
  slides: z.array(
    z.object({
      type: z.enum(SLIDE_TYPES),
      title: z.string(),
      body: z.string(),
      note: z.string(),
      spray: z.string(),
    }),
  ),
});

export type RoastOutput = z.infer<typeof roastOutputSchema>;
export type SlideCopy = Partial<Record<CopyField, string>>;
export type DeckCopy = Partial<Record<DeckSlide["type"], SlideCopy>>;

// Harmless in a joke, like "24 hours a day" or "365 days a year".
const EVERYDAY_NUMBERS = ["12", "24", "60", "100", "365"];

/** Numbers the text may quote: everything shown on the slides, plus small everyday ones. */
function allowedNumbers(deck: DeckSlide[]) {
  const allowed = new Set([
    ...Array.from({ length: 11 }, (_, number) => String(number)),
    ...EVERYDAY_NUMBERS,
  ]);

  function collect(value: unknown, key?: string) {
    // The clock's raw cells are never shown to the model, so it cannot quote them.
    if (key === "cells") return;
    if (typeof value === "number") {
      allowed.add(String(Math.round(key === "share" ? value * 100 : value)));
      // A decade may also be written the short way: "the 90s".
      if (key === "decade") allowed.add(String(value % 100).padStart(2, "0"));
    } else if (typeof value === "string") {
      for (const match of value.match(/\d+/g) ?? []) allowed.add(match);
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([childKey, child]) =>
        collect(child, childKey),
      );
    }
  }
  collect(deck);
  return allowed;
}

function quotedNumbers(text: string) {
  // Joins thousands separators, so "1 840" and "1,840" both read as 1840.
  return (text.match(/\d(?:[\d\s.,]*\d)?/g) ?? []).map((number) =>
    number.replace(/\D/g, ""),
  );
}

/** Polish past-tense verbs addressing the reader reveal gender: "kupiłeś", "kupiłaś". */
const GENDERED_TEXT = {
  pl: /\p{L}+(?:łeś|łaś)(?!\p{L})/iu,
  en: /\b(?:he|she|him|his|hers?|man|woman|sir|madam|guy|girl|lady)\b/i,
};
const MARKDOWN = /[*~`#]|__/;

/** Turns model output into slide copy, or lists why it cannot be used. */
export function validateRoastOutput(
  output: RoastOutput,
  deck: DeckSlide[],
  locale: "pl" | "en" = "en",
): { copy: DeckCopy; problems: [] } | { copy: null; problems: string[] } {
  const problems: string[] = [];
  const allowed = allowedNumbers(deck);
  const copy: DeckCopy = {};

  for (const { type } of deck) {
    const slides = output.slides.filter((slide) => slide.type === type);
    if (slides.length !== 1) {
      problems.push(`${type}: expected one slide, got ${slides.length}`);
      continue;
    }

    const slideCopy: SlideCopy = {};
    for (const field of COPY_FIELDS[type]) {
      const text = slides[0][field].trim();
      if (!text) problems.push(`${type}.${field}: empty`);
      if (text.length > COPY_LIMITS[field] * LIMIT_TOLERANCE) {
        problems.push(
          `${type}.${field}: much longer than ${COPY_LIMITS[field]} characters`,
        );
      }
      const invented = quotedNumbers(text).filter((n) => !allowed.has(n));
      if (invented.length > 0) {
        problems.push(`${type}.${field}: invented numbers ${invented}`);
      }
      if (GENDERED_TEXT[locale].test(text)) {
        problems.push(`${type}.${field}: assumes the reader's gender`);
      }
      if (MARKDOWN.test(text)) {
        problems.push(`${type}.${field}: contains markdown`);
      }
      slideCopy[field] = text;
    }
    copy[type] = slideCopy;
  }

  const expected = new Set(deck.map((slide) => slide.type));
  for (const { type } of output.slides) {
    if (!expected.has(type)) problems.push(`${type}: not in this deck`);
  }

  return problems.length > 0 ? { copy: null, problems } : { copy, problems: [] };
}
