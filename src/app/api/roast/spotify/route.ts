import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveRoast } from "@/db/roasts";
import {
  addGenerationCost,
  hasMonthlyBudget,
  releaseGeneration,
  reserveGeneration,
} from "@/db/usage";
import { createRoast } from "@/roast/create-roast";
import { buildSpotifyDeck } from "@/roast/deck";
import {
  createRoastModel,
  generateRoastCopy,
  roastModelId,
} from "@/roast/generate";
import { HEAT_LEVELS, PROMPT_VERSION } from "@/roast/prompt";
import { ROAST_STATUS_CODES } from "@/roast/status-codes";
import { spotifyStatsSchema } from "@/sources/spotify/stats";

const requestSchema = z.object({
  heat: z.enum(HEAT_LEVELS),
  locale: z.enum(["pl", "en"]),
  stats: spotifyStatsSchema,
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { heat, locale, stats } = input.data;

  const result = await createRoast({
    hasBudget: hasMonthlyBudget,
    reserve: () => reserveGeneration(userId),
    release: () => releaseGeneration(userId),
    addCost: (costUsd) => addGenerationCost(userId, costUsd),
    prepare: async () => ({ stats, deck: buildSpotifyDeck(stats) }),
    generate: (deck) =>
      generateRoastCopy(deck, heat, locale, createRoastModel()),
    save: ({ deck, copy }) =>
      saveRoast({
        userId,
        source: "spotify_export",
        locale,
        heat,
        stats,
        slides: { deck, copy },
        model: roastModelId(),
        promptVersion: PROMPT_VERSION,
      }),
  });

  if (result.status === "ok") {
    return NextResponse.json({ id: result.id });
  }
  return NextResponse.json(
    { error: result.status },
    { status: ROAST_STATUS_CODES[result.status] },
  );
}
