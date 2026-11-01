import { computeSteamStats, type SteamStats } from "@/sources/steam/stats";
import type { SteamProfile } from "@/sources/steam/client";
import type { DeckCopy } from "./copy";
import { buildSteamDeck, type DeckSlide } from "./deck";
import { RoastGenerationError } from "./generate";
import type { Heat, RoastLocale } from "./prompt";

export type CreateRoastResult =
  | { status: "ok"; id: string }
  | { status: "budget" | "limit" | "unavailable" | "failed" };

export type CreateRoastDeps = {
  hasBudget: () => Promise<boolean>;
  reserve: () => Promise<boolean>;
  release: () => Promise<void>;
  addCost: (costUsd: number) => Promise<void>;
  fetchProfile: () => Promise<SteamProfile>;
  generate: (
    deck: DeckSlide[],
    heat: Heat,
    locale: RoastLocale,
  ) => Promise<{ copy: DeckCopy; costUsd: number }>;
  save: (roast: {
    stats: SteamStats;
    deck: DeckSlide[];
    copy: DeckCopy;
  }) => Promise<string>;
};

/** Runs the whole flow. A roast that never reaches the user does not use up their daily limit. */
export async function createSteamRoast(
  input: {
    heat: Heat;
    locale: RoastLocale;
    excludedAppIds: number[];
    nowSeconds: number;
  },
  deps: CreateRoastDeps,
): Promise<CreateRoastResult> {
  if (!(await deps.hasBudget())) return { status: "budget" };
  if (!(await deps.reserve())) return { status: "limit" };

  try {
    const profile = await deps.fetchProfile();
    if (profile.status !== "ok") {
      await deps.release();
      return { status: "unavailable" };
    }

    const excluded = new Set(input.excludedAppIds);
    const stats = computeSteamStats(
      profile.games.filter((game) => !excluded.has(game.appid)),
      input.nowSeconds,
    );
    const deck = buildSteamDeck(profile.name, stats, input.nowSeconds);

    const { copy, costUsd } = await deps.generate(
      deck,
      input.heat,
      input.locale,
    );
    await deps.addCost(costUsd);

    const id = await deps.save({ stats, deck, copy });
    return { status: "ok", id };
  } catch (error) {
    await deps.release();
    if (error instanceof RoastGenerationError) {
      await deps.addCost(error.costUsd);
    }
    return { status: "failed" };
  }
}
