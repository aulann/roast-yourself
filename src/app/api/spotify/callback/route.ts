import { auth } from "@clerk/nextjs/server";
import { hasLocale } from "next-intl";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { requestOrigin } from "@/lib/request-origin";
import {
  createSpotifyLink,
  exchangeCode,
  isSpotifyOAuthEnabled,
  SPOTIFY_LINK_COOKIE,
  SPOTIFY_STATE_COOKIE,
} from "@/sources/spotify/oauth";

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const [param, nonce] = (searchParams.get("state") ?? "").split(".");
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, origin));
  }

  const expectedNonce = request.cookies.get(SPOTIFY_STATE_COOKIE)?.value;
  const code = searchParams.get("code");
  const redirectUri = new URL("/api/spotify/callback", origin).toString();

  const token =
    code && nonce && nonce === expectedNonce
      ? await exchangeCode(code, redirectUri).catch(() => null)
      : null;

  const target = new URL(`/${locale}/roast/spotify`, origin);
  if (!token) target.searchParams.set("error", "connect");

  const response = NextResponse.redirect(target);
  response.cookies.delete({ name: SPOTIFY_STATE_COOKIE, path: "/api/spotify" });
  if (token) {
    response.cookies.set(
      SPOTIFY_LINK_COOKIE,
      createSpotifyLink(userId, token.accessToken, token.maxAge),
      {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: token.maxAge,
      },
    );
  }
  return response;
}
