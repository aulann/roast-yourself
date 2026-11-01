import { auth } from "@clerk/nextjs/server";
import { hasLocale } from "next-intl";
import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { STEAM_STATE_COOKIE } from "@/sources/steam/link";
import { buildSteamLoginUrl } from "@/sources/steam/openid";

const STATE_MAX_AGE = 10 * 60;

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("locale");
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;

  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  }

  const state = randomBytes(16).toString("hex");
  const returnTo = new URL("/api/steam/callback", request.url);
  returnTo.searchParams.set("locale", locale);
  returnTo.searchParams.set("state", state);

  const response = NextResponse.redirect(buildSteamLoginUrl(returnTo.toString()));
  response.cookies.set(STEAM_STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/steam",
    maxAge: STATE_MAX_AGE,
  });
  return response;
}
