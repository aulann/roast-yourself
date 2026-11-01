import { auth } from "@clerk/nextjs/server";
import { useTranslations } from "next-intl";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { Link, redirect } from "@/i18n/navigation";
import { fetchSteamProfile, type SteamProfile } from "@/sources/steam/client";
import { readSteamLink, STEAM_LINK_COOKIE } from "@/sources/steam/link";
import { computeSteamStats } from "@/sources/steam/stats";

async function ConnectSteam({ failed }: { failed: boolean }) {
  const t = await getTranslations("steam");
  const locale = await getLocale();

  return (
    <>
      {failed && <p className="text-vandal">{t("connectFailed")}</p>}
      <p className="max-w-md text-muted">{t("connectLead")}</p>
      <a
        href={`/api/steam/connect?locale=${locale}`}
        className="self-start border border-paper px-4 py-3 font-mono text-xs uppercase tracking-widest"
      >
        {t("connect")}
      </a>
    </>
  );
}

async function Disconnect() {
  const t = await getTranslations("steam");
  const locale = await getLocale();

  return (
    <form action={`/api/steam/disconnect?locale=${locale}`} method="post">
      <button className="font-mono text-xs uppercase tracking-widest text-muted underline">
        {t("disconnect")}
      </button>
    </form>
  );
}

async function SteamStatsView({
  profile,
}: {
  profile: Extract<SteamProfile, { status: "ok" }>;
}) {
  const t = await getTranslations("steam");
  const format = await getFormatter();
  const { totalGames, playtime } = computeSteamStats(profile.games);
  const hours = (minutes: number) =>
    format.number(Math.round(minutes / 60));

  const rows = playtime
    ? [
        [t("stats.games"), format.number(totalGames)],
        [t("stats.hours"), hours(playtime.totalMinutes)],
        [t("stats.recentHours"), hours(playtime.lastTwoWeeksMinutes)],
        [
          t("stats.neverPlayed"),
          `${format.number(playtime.neverPlayed)} (${format.number(playtime.neverPlayedShare, { style: "percent" })})`,
        ],
        [t("stats.barelyPlayed"), format.number(playtime.barelyPlayed)],
        [
          t("stats.topShare"),
          format.number(playtime.topGameShare, { style: "percent" }),
        ],
      ]
    : [[t("stats.games"), format.number(totalGames)]];

  return (
    <>
      <p className="text-muted">{t("connectedAs", { name: profile.name })}</p>
      <Link
        href="/roast/steam/deck"
        className="self-start bg-vandal px-4 py-3 font-mono text-xs uppercase tracking-widest text-paper"
      >
        {t("showDeck")}
      </Link>
      <dl className="grid max-w-xl grid-cols-[1fr_auto] gap-x-8 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-mono">{value}</dd>
          </div>
        ))}
      </dl>
      {!playtime && <p className="max-w-md text-muted">{t("playtimeHidden")}</p>}
      {playtime && (
        <>
          <h2 className="font-serif text-2xl">{t("topGames")}</h2>
          <ol className="max-w-xl space-y-1">
            {playtime.topGames.map((game) => (
              <li key={game.appId} className="flex justify-between gap-8">
                <span>{game.name}</span>
                <span className="font-mono">{hours(game.minutes)} h</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

async function SteamContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/roast/steam">["searchParams"];
}) {
  await connection();
  const locale = await getLocale();
  const { userId } = await auth();
  if (!userId) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("steam");
  const token = (await cookies()).get(STEAM_LINK_COOKIE)?.value;
  const steamId = token ? readSteamLink(token, userId) : null;
  if (!steamId) {
    const { error } = await searchParams;
    return <ConnectSteam failed={error === "connect"} />;
  }

  const profile = await fetchSteamProfile(steamId).catch(() => null);

  return (
    <>
      {!profile && <p className="max-w-md text-vandal">{t("unavailable")}</p>}
      {profile?.status === "not_found" && (
        <p className="max-w-md text-vandal">{t("unavailable")}</p>
      )}
      {profile?.status === "private" && (
        <p className="max-w-md text-muted">
          {t("private", { name: profile.name })}
        </p>
      )}
      {profile?.status === "ok" && <SteamStatsView profile={profile} />}
      <Disconnect />
    </>
  );
}

export default function SteamPage({
  searchParams,
}: PageProps<"/[locale]/roast/steam">) {
  const t = useTranslations("steam");

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-16 sm:px-8">
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      <Suspense>
        <SteamContent searchParams={searchParams} />
      </Suspense>
      <p className="mt-auto max-w-xl text-xs text-muted">{t("disclaimer")}</p>
    </main>
  );
}
