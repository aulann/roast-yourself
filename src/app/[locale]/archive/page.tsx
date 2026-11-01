import { auth } from "@clerk/nextjs/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";

async function ArchiveContent() {
  const { isAuthenticated } = await auth();
  const locale = await getLocale();
  if (!isAuthenticated) {
    redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("archive");

  return (
    <>
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      <p className="text-muted">{t("empty")}</p>
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
