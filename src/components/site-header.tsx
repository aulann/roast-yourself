import { Show, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations("nav");

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 font-mono text-xs uppercase tracking-widest sm:px-8">
      <Link href="/">Roast Yourself</Link>
      <nav className="flex items-center gap-4">
        <Suspense>
          <LocaleSwitcher />
        </Suspense>
        <Suspense>
          <Show when="signed-in">
            <Link href="/archive">{t("archive")}</Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in">{t("signIn")}</Link>
          </Show>
        </Suspense>
      </nav>
    </header>
  );
}
