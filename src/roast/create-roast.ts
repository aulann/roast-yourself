import type { DeckCopy } from "./copy";
import type { DeckSlide } from "./deck";
import { RoastGenerationError } from "./generate";

export type CreateRoastResult =
  | { status: "ok"; id: string }
  | { status: "budget" | "limit" | "unavailable" | "failed" };

export type CreateRoastDeps<Stats> = {
  hasBudget: () => Promise<boolean>;
  reserve: () => Promise<boolean>;
  release: () => Promise<void>;
  addCost: (costUsd: number) => Promise<void>;
  /** Null when the source has nothing to review right now. */
  prepare: () => Promise<{ stats: Stats; deck: DeckSlide[] } | null>;
  generate: (deck: DeckSlide[]) => Promise<{ copy: DeckCopy; costUsd: number }>;
  save: (roast: {
    stats: Stats;
    deck: DeckSlide[];
    copy: DeckCopy;
  }) => Promise<string>;
};

/** Runs the whole flow. A roast that never reaches the user does not use up their daily limit. */
export async function createRoast<Stats>(
  deps: CreateRoastDeps<Stats>,
): Promise<CreateRoastResult> {
  if (!(await deps.hasBudget())) return { status: "budget" };
  if (!(await deps.reserve())) return { status: "limit" };

  try {
    const prepared = await deps.prepare();
    if (!prepared) {
      await deps.release();
      return { status: "unavailable" };
    }

    const { copy, costUsd } = await deps.generate(prepared.deck);
    await deps.addCost(costUsd);

    const id = await deps.save({ ...prepared, copy });
    return { status: "ok", id };
  } catch (error) {
    await deps.release();
    if (error instanceof RoastGenerationError) {
      await deps.addCost(error.costUsd);
    }
    return { status: "failed" };
  }
}
