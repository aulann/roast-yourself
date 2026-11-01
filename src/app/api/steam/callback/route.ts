import { auth } from "@clerk/nextjs/server";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  createSteamLink,
  STEAM_LINK_COOKIE,
  STEAM_LINK_MAX_AGE,
  STEAM_STATE_COOKIE,
} from "@/sources/steam/link";
import { verifySteamResponse } from "@/sources/steam/openid";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const param = searchParams.get("locale");
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  }

  const state = searchParams.get("state");
  const expectedState = request.cookies.get(STEAM_STATE_COOKIE)?.value;

  // return_to is rebuilt from our own state cookie, so only a login we started can pass.
  const returnTo = new URL("/api/steam/callback", request.url);
  returnTo.searchParams.set("locale", locale);
  returnTo.searchParams.set("state", expectedState ?? "");

  const steamId =
    state && state === expectedState
      ? await verifySteamResponse(searchParams, returnTo.toString()).catch(
          () => null,
        )
      : null;

  const target = new URL(`/${locale}/roast/steam`, request.url);
  if (!steamId) target.searchParams.set("error", "connect");

  const response = NextResponse.redirect(target);
  response.cookies.delete({ name: STEAM_STATE_COOKIE, path: "/api/steam" });
  if (steamId) {
    response.cookies.set(STEAM_LINK_COOKIE, createSteamLink(userId, steamId), {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: STEAM_LINK_MAX_AGE,
    });
  }
  return response;
}
