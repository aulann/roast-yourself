import { auth } from "@clerk/nextjs/server";
import {
  getFormatter,
  getLocale,
  getTranslations,
} from "next-intl/server";
import { Suspense } from "react";
import { listOwnRoasts } from "@/db/roasts";
import { Link, redirect } from "@/i18n/navigation";

async function ArchiveContent() {
  const { userId } = await auth();
  const locale = await getLocale();
  if (!userId) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("archive");
  const format = await getFormatter();
  const roasts = await listOwnRoasts(userId);

  return (
    <>
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      {roasts.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="text-muted">{t("empty")}</p>
          <Link href="/roast/steam" className="underline">
            {t("start")}
          </Link>
        </div>
      ) : (
        <ol className="max-w-xl divide-y divide-paper/10">
          {roasts.map((roast, index) => (
            <li key={roast.id}>
              <Link
                href={`/roast/${roast.id}`}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <span className="font-serif text-xl">
                  {t("issue", { number: roasts.length - index })}
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  {t(`heat.${roast.heat}`)} ·{" "}
                  {format.dateTime(roast.createdAt, { dateStyle: "medium" })}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export default function ArchivePage() {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-16 sm:px-8">
      <Suspense>
        <ArchiveContent />
      </Suspense>
    </main>
  );
}
