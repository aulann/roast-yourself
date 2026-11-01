import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { Stories } from "@/components/deck/stories";
import { redirect } from "@/i18n/navigation";
import { buildSteamDeck, currentUnixSeconds } from "@/roast/deck";
import { fetchSteamProfile } from "@/sources/steam/client";
import { readSteamLink, STEAM_LINK_COOKIE } from "@/sources/steam/link";
import { computeSteamStats } from "@/sources/steam/stats";

async function SteamDeck() {
  await connection();
  const locale = await getLocale();
  const { userId } = await auth();
  if (!userId) {
    return redirect({ href: "/sign-in", locale });
  }

  const token = (await cookies()).get(STEAM_LINK_COOKIE)?.value;
  const steamId = token ? readSteamLink(token, userId) : null;
  const profile = steamId ? await fetchSteamProfile(steamId).catch(() => null) : null;
  if (profile?.status !== "ok") {
    // The Steam page explains what is missing: no link, a private profile or an outage.
    return redirect({ href: "/roast/steam", locale });
  }

  const now = currentUnixSeconds();
  const slides = buildSteamDeck(
    profile.name,
    computeSteamStats(profile.games, now),
    now,
  );

  return <Stories slides={slides} closeHref="/roast/steam" />;
}

export default function SteamDeckPage() {
  return (
    <Suspense>
      <SteamDeck />
    </Suspense>
  );
}
