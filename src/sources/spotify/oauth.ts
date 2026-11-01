import { z } from "zod";
import { openSealedValue, sealValue } from "@/lib/sealed-value";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SCOPES = "user-top-read user-read-recently-played";
const MAX_LINK_SECONDS = 50 * 60;

export const SPOTIFY_LINK_COOKIE = "spotify_link";
export const SPOTIFY_STATE_COOKIE = "spotify_state";

/** The whole feature can be switched off, as Spotify may block the app under its developer policy. */
export function isSpotifyOAuthEnabled() {
  return process.env.SPOTIFY_OAUTH_ENABLED === "true";
}

function setting(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function buildAuthorizeUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: setting("SPOTIFY_CLIENT_ID"),
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

/** Asks for tokens and keeps only the short-lived one: no refresh token is ever stored. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
  fetchFn: typeof fetch = fetch,
) {
  const credentials = Buffer.from(
    `${setting("SPOTIFY_CLIENT_ID")}:${setting("SPOTIFY_CLIENT_SECRET")}`,
  ).toString("base64");

  const response = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const token = tokenSchema.safeParse(await response.json());
  if (!token.success) return null;
  return {
    accessToken: token.data.access_token,
    maxAge: Math.min(token.data.expires_in, MAX_LINK_SECONDS),
  };
}

const linkSchema = z.object({
  userId: z.string(),
  accessToken: z.string(),
  expiresAt: z.number(),
});

function linkSecret() {
  return setting("SPOTIFY_LINK_SECRET");
}

export function createSpotifyLink(
  userId: string,
  accessToken: string,
  maxAge: number,
  now = Date.now(),
) {
  return sealValue(
    { userId, accessToken, expiresAt: now + maxAge * 1000 },
    linkSecret(),
  );
}

/** Returns the token only for the Clerk user who connected it, and only until it expires. */
export function readSpotifyLink(token: string, userId: string, now = Date.now()) {
  const link = linkSchema.safeParse(openSealedValue(token, linkSecret()));
  if (!link.success || link.data.userId !== userId || link.data.expiresAt <= now) {
    return null;
  }
  return link.data.accessToken;
}
