import { auth } from "@clerk/nextjs/server";
import { hasLocale } from "next-intl";
import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { requestOrigin } from "@/lib/request-origin";
import {
  buildAuthorizeUrl,
  isSpotifyOAuthEnabled,
  SPOTIFY_STATE_COOKIE,
} from "@/sources/spotify/oauth";

const STATE_MAX_AGE = 10 * 60;

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const param = request.nextUrl.searchParams.get("locale");
  const locale = hasLocale(routing.locales, param) ? param : routing.defaultLocale;

  // Spotify rejects localhost, and sessions do not carry over, so restart on the address it accepts.
  const { hostname, port } = new URL(origin);
  if (hostname === "localhost") {
    return NextResponse.redirect(
      `http://127.0.0.1:${port}/${locale}/roast/spotify`,
    );
  }

  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, origin));
  }

  const nonce = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/spotify/callback", origin).toString();

  const response = NextResponse.redirect(
    buildAuthorizeUrl(redirectUri, `${locale}.${nonce}`),
  );
  response.cookies.set(SPOTIFY_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/api/spotify",
    maxAge: STATE_MAX_AGE,
  });
  return response;
}
