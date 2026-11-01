import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { STEAM_LINK_COOKIE } from "@/sources/steam/link";

export async function POST(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("locale");
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;

  const response = NextResponse.redirect(
    new URL(`/${locale}/roast/steam`, request.url),
    303,
  );
  response.cookies.delete(STEAM_LINK_COOKIE);
  return response;
}
