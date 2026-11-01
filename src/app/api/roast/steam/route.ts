import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveSteamRoast } from "@/db/roasts";
import {
  addGenerationCost,
  hasMonthlyBudget,
  releaseGeneration,
  reserveGeneration,
} from "@/db/usage";
import { createSteamRoast } from "@/roast/create-roast";
import { currentUnixSeconds } from "@/roast/deck";
import {
  createRoastModel,
  generateRoastCopy,
  roastModelId,
} from "@/roast/generate";
import { HEAT_LEVELS, PROMPT_VERSION } from "@/roast/prompt";
import { fetchSteamProfile } from "@/sources/steam/client";
import { readSteamLink, STEAM_LINK_COOKIE } from "@/sources/steam/link";

const requestSchema = z.object({
  heat: z.enum(HEAT_LEVELS),
  locale: z.enum(["pl", "en"]),
  excludedAppIds: z.array(z.number().int().nonnegative()).max(20_000),
});

const STATUS_CODES = {
  budget: 503,
  limit: 429,
  unavailable: 409,
  failed: 502,
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const token = (await cookies()).get(STEAM_LINK_COOKIE)?.value;
  const steamId = token ? readSteamLink(token, userId) : null;
  if (!steamId) {
    return NextResponse.json({ error: "not_linked" }, { status: 409 });
  }

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { heat, locale } = input.data;

  const result = await createSteamRoast(
    { ...input.data, nowSeconds: currentUnixSeconds() },
    {
      hasBudget: hasMonthlyBudget,
      reserve: () => reserveGeneration(userId),
      release: () => releaseGeneration(userId),
      addCost: (costUsd) => addGenerationCost(userId, costUsd),
      fetchProfile: () => fetchSteamProfile(steamId),
      generate: (deck, slideHeat, slideLocale) =>
        generateRoastCopy(deck, slideHeat, slideLocale, createRoastModel()),
      save: ({ stats, deck, copy }) =>
        saveSteamRoast({
          userId,
          locale,
          heat,
          stats,
          slides: { deck, copy },
          model: roastModelId(),
          promptVersion: PROMPT_VERSION,
        }),
    },
  );

  if (result.status === "ok") {
    return NextResponse.json({ id: result.id });
  }
  return NextResponse.json(
    { error: result.status },
    { status: STATUS_CODES[result.status] },
  );
}
