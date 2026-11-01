import { useTranslations } from "next-intl";
import { Stories } from "@/components/deck/stories";
import { DEMO_DECK } from "@/roast/demo";

export default function DemoPage() {
  const t = useTranslations("deck");

  return <Stories slides={DEMO_DECK} closeHref="/" badge={t("demoBadge")} />;
}
