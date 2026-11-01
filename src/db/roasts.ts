import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DeckCopy } from "@/roast/copy";
import type { DeckSlide } from "@/roast/deck";
import type { Heat, RoastLocale } from "@/roast/prompt";
import { getDb } from "./index";
import { roasts } from "./schema";

const SCHEMA_VERSION = 1;

export type StoredSlides = { deck: DeckSlide[]; copy: DeckCopy };

export async function saveSteamRoast(roast: {
  userId: string;
  locale: RoastLocale;
  heat: Heat;
  stats: unknown;
  slides: StoredSlides;
  model: string;
  promptVersion: string;
}) {
  const [{ id }] = await getDb()
    .insert(roasts)
    .values({
      clerkUserId: roast.userId,
      source: "steam",
      locale: roast.locale,
      heat: roast.heat,
      stats: roast.stats,
      slides: roast.slides,
      schemaVersion: SCHEMA_VERSION,
      model: roast.model,
      promptVersion: roast.promptVersion,
      status: "ready",
    })
    .returning({ id: roasts.id });
  return id;
}

/** Null for a missing roast and for someone else's, so the two look the same from outside. */
export async function getOwnRoast(id: string, userId: string) {
  if (!z.uuid().safeParse(id).success) return null;

  const [roast] = await getDb()
    .select({
      locale: roasts.locale,
      slides: roasts.slides,
    })
    .from(roasts)
    .where(and(eq(roasts.id, id), eq(roasts.clerkUserId, userId)));
  if (!roast) return null;
  return { locale: roast.locale, slides: roast.slides as StoredSlides };
}

export async function listOwnRoasts(userId: string) {
  return getDb()
    .select({
      id: roasts.id,
      heat: roasts.heat,
      source: roasts.source,
      createdAt: roasts.createdAt,
    })
    .from(roasts)
    .where(eq(roasts.clerkUserId, userId))
    .orderBy(desc(roasts.createdAt));
}
