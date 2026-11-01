import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { requestOrigin } from "@/lib/request-origin";
import { SPOTIFY_LINK_COOKIE } from "@/sources/spotify/oauth";

export async function POST(request: NextRequest) {
  const origin = requestOrigin(request);
  const param = request.nextUrl.searchParams.get("locale");
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;

  const response = NextResponse.redirect(
    new URL(`/${locale}/roast/spotify`, origin),
    303,
  );
  response.cookies.delete(SPOTIFY_LINK_COOKIE);
  return response;
}
