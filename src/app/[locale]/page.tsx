import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="flex flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-8">
      <p className="font-mono text-xs uppercase tracking-widest text-muted">
        {t("issue")}
      </p>
      <h1 className="max-w-4xl font-serif text-5xl leading-none sm:text-8xl">
        {t("title")}
      </h1>
      <p className="-rotate-2 font-hand text-3xl text-vandal">
        {t("correction")}
      </p>
      <p className="max-w-md text-muted">{t("lead")}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="bg-vandal px-4 py-3 font-mono text-xs uppercase tracking-widest text-paper"
        >
          {t("demo")}
        </Link>
        <Link
          href="/roast/steam"
          className="border border-paper px-4 py-3 font-mono text-xs uppercase tracking-widest"
        >
          {t("cta")}
        </Link>
        <Link
          href="/roast/spotify"
          className="border border-paper px-4 py-3 font-mono text-xs uppercase tracking-widest"
        >
          {t("spotify")}
        </Link>
      </div>
    </main>
  );
}
