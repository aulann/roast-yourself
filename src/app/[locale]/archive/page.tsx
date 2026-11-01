import { useTranslations } from "next-intl";

export default function ArchivePage() {
  const t = useTranslations("archive");

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-16 sm:px-8">
      <h1 className="font-serif text-4xl">{t("title")}</h1>
      <p className="text-muted">{t("empty")}</p>
    </main>
  );
}
