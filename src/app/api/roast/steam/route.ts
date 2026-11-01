import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
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
import { buildSteamDeck, currentUnixSeconds } from "@/roast/deck";
import {
  createRoastModel,
  generateRoastCopy,
  roastModelId,
} from "@/roast/generate";
import { HEAT_LEVELS, PROMPT_VERSION } from "@/roast/prompt";
import { ROAST_STATUS_CODES } from "@/roast/status-codes";
import { fetchSteamProfile } from "@/sources/steam/client";
import { readSteamLink, STEAM_LINK_COOKIE } from "@/sources/steam/link";
import { computeSteamStats } from "@/sources/steam/stats";

const requestSchema = z.object({
  heat: z.enum(HEAT_LEVELS),
  locale: z.enum(["pl", "en"]),
  excludedAppIds: z.array(z.number().int().nonnegative()).max(20_000),
});

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
  const { heat, locale, excludedAppIds } = input.data;

  const result = await createRoast({
    hasBudget: hasMonthlyBudget,
    reserve: () => reserveGeneration(userId),
    release: () => releaseGeneration(userId),
    addCost: (costUsd) => addGenerationCost(userId, costUsd),
    prepare: async () => {
      const profile = await fetchSteamProfile(steamId);
      if (profile.status !== "ok") return null;

      const excluded = new Set(excludedAppIds);
      const now = currentUnixSeconds();
      const stats = computeSteamStats(
        profile.games.filter((game) => !excluded.has(game.appid)),
        now,
      );
      return { stats, deck: buildSteamDeck(profile.name, stats, now) };
    },
    generate: (deck) =>
      generateRoastCopy(deck, heat, locale, createRoastModel()),
    save: ({ stats, deck, copy }) =>
      saveRoast({
        userId,
        source: "steam",
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
