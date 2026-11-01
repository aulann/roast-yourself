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
import { buildSpotifyLiveDeck } from "@/roast/deck";
import {
  createRoastModel,
  generateRoastCopy,
  roastModelId,
} from "@/roast/generate";
import { HEAT_LEVELS, PROMPT_VERSION } from "@/roast/prompt";
import { ROAST_STATUS_CODES } from "@/roast/status-codes";
import { fetchSpotifyLibrary } from "@/sources/spotify/client";
import { computeSpotifyLiveStats } from "@/sources/spotify/live-stats";
import {
  isSpotifyOAuthEnabled,
  readSpotifyLink,
  SPOTIFY_LINK_COOKIE,
} from "@/sources/spotify/oauth";

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const excludedNames = z.array(z.string().max(500)).max(500);

const requestSchema = z.object({
  heat: z.enum(HEAT_LEVELS),
  locale: z.enum(["pl", "en"]),
  timeZone: z.string().max(100).refine(isTimeZone),
  excludedArtists: excludedNames,
  excludedTracks: excludedNames,
});

export async function POST(request: Request) {
  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const token = (await cookies()).get(SPOTIFY_LINK_COOKIE)?.value;
  const accessToken = token ? readSpotifyLink(token, userId) : null;
  if (!accessToken) {
    return NextResponse.json({ error: "not_linked" }, { status: 409 });
  }

  const input = requestSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { heat, locale, timeZone, excludedArtists, excludedTracks } = input.data;

  const result = await createRoast({
    hasBudget: hasMonthlyBudget,
    reserve: () => reserveGeneration(userId),
    release: () => releaseGeneration(userId),
    addCost: (costUsd) => addGenerationCost(userId, costUsd),
    prepare: async () => {
      const library = await fetchSpotifyLibrary(accessToken);
      if (library.status !== "ok") return null;

      const stats = computeSpotifyLiveStats(library.library, timeZone, {
        artists: excludedArtists,
        tracks: excludedTracks,
      });
      return stats ? { stats, deck: buildSpotifyLiveDeck(stats) } : null;
    },
    generate: (deck) =>
      generateRoastCopy(deck, heat, locale, createRoastModel()),
    save: ({ stats, deck, copy }) =>
      saveRoast({
        userId,
        source: "spotify_oauth",
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
