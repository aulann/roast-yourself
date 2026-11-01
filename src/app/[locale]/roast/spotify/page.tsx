import { auth } from "@clerk/nextjs/server";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { SpotifyLiveForm } from "@/components/spotify-live-form";
import { SpotifyUpload } from "@/components/spotify-upload";
import { redirect } from "@/i18n/navigation";
import { fetchSpotifyLibrary } from "@/sources/spotify/client";
import {
  isSpotifyOAuthEnabled,
  readSpotifyLink,
  SPOTIFY_LINK_COOKIE,
} from "@/sources/spotify/oauth";

const PRIVACY_SETTINGS_URL = "https://www.spotify.com/account/privacy/";

async function ExportSection() {
  const t = await getTranslations("spotify");

  return (
    <>
      <p className="max-w-xl text-muted">{t("lead")}</p>
      <SpotifyUpload />
      <details className="max-w-xl">
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest">
          {t("guide.title")}
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
          <li>
            <a
              href={PRIVACY_SETTINGS_URL}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {t("guide.step1")}
            </a>
          </li>
          <li>{t("guide.step2")}</li>
          <li>{t("guide.step3")}</li>
          <li>{t("guide.step4")}</li>
        </ol>
      </details>
    </>
  );
}

async function LiveSection({
  userId,
  failed,
}: {
  userId: string;
  failed: boolean;
}) {
  const t = await getTranslations("spotify.live");
  const locale = await getLocale();
  const token = (await cookies()).get(SPOTIFY_LINK_COOKIE)?.value;
  const accessToken = token ? readSpotifyLink(token, userId) : null;

  if (!accessToken) {
    return (
      <section className="flex max-w-xl flex-col gap-3">
        {failed && <p className="text-vandal">{t("connectFailed")}</p>}
        <p className="text-muted">{t("connectLead")}</p>
        <a
          href={`/api/spotify/connect?locale=${locale}`}
          className="self-start bg-vandal px-4 py-3 font-mono text-xs uppercase tracking-widest text-paper"
        >
          {t("connect")}
        </a>
      </section>
    );
  }

  const result = await fetchSpotifyLibrary(accessToken).catch(() => null);

  return (
    <section className="flex flex-col gap-6">
      {!result && <p className="max-w-xl text-vandal">{t("unavailable")}</p>}
      {result?.status === "expired" && (
        <p className="max-w-xl text-vandal">{t("expired")}</p>
      )}
      {result?.status === "not_allowed" && (
        <p className="max-w-xl text-vandal">{t("notAllowed")}</p>
      )}
      {result?.status === "ok" && (
        <SpotifyLiveForm library={result.library} timeZoneFallback="UTC" />
      )}
      <form action={`/api/spotify/disconnect?locale=${locale}`} method="post">
        <button className="font-mono text-xs uppercase tracking-widest text-muted underline">
          {t("disconnect")}
        </button>
      </form>
    </section>
  );
}

async function SpotifyContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/roast/spotify">["searchParams"];
}) {
  await connection();
  const locale = await getLocale();
  const { userId } = await auth();
  if (!userId) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("spotify");
  const { error } = await searchParams;

  return (
    <>
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      {isSpotifyOAuthEnabled() && (
        <LiveSection userId={userId} failed={error === "connect"} />
      )}
      <ExportSection />
    </>
  );
}

export default function SpotifyPage({
  searchParams,
}: PageProps<"/[locale]/roast/spotify">) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-16 sm:px-8">
      <Suspense>
        <SpotifyContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
