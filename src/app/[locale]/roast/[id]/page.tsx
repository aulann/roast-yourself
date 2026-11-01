import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Stories } from "@/components/deck/stories";
import { getOwnRoast } from "@/db/roasts";
import { redirect } from "@/i18n/navigation";

async function Roast({
  params,
}: {
  params: PageProps<"/[locale]/roast/[id]">["params"];
}) {
  const { id } = await params;
  const locale = await getLocale();
  const { userId } = await auth();
  if (!userId) {
    return redirect({ href: "/sign-in", locale });
  }

  const roast = await getOwnRoast(id, userId);
  if (!roast) notFound();

  // The critic's text exists in one language, so the labels around it have to match.
  if (roast.locale !== locale) {
    return redirect({ href: `/roast/${id}`, locale: roast.locale });
  }

  return (
    <Stories
      slides={roast.slides.deck}
      copy={roast.slides.copy}
      closeHref="/archive"
    />
  );
}

export default function RoastPage({ params }: PageProps<"/[locale]/roast/[id]">) {
  return (
    <Suspense>
      <Roast params={params} />
    </Suspense>
  );
}
