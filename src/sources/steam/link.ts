import { z } from "zod";
import { readSignedValue, signValue } from "@/lib/signed-value";

export const STEAM_LINK_COOKIE = "steam_link";
export const STEAM_STATE_COOKIE = "steam_state";
export const STEAM_LINK_MAX_AGE = 60 * 60;

const linkSchema = z.object({
  userId: z.string(),
  steamId: z.string(),
  expiresAt: z.number(),
});

function linkSecret() {
  const secret = process.env.STEAM_LINK_SECRET;
  if (!secret) throw new Error("STEAM_LINK_SECRET is not set");
  return secret;
}

export function createSteamLink(userId: string, steamId: string, now = Date.now()) {
  return signValue(
    { userId, steamId, expiresAt: now + STEAM_LINK_MAX_AGE * 1000 },
    linkSecret(),
  );
}

/** Returns the SteamID only if this exact Clerk user confirmed it and the link has not expired. */
export function readSteamLink(token: string, userId: string, now = Date.now()) {
  const link = linkSchema.safeParse(readSignedValue(token, linkSecret()));
  if (!link.success || link.data.userId !== userId || link.data.expiresAt <= now) {
    return null;
  }
  return link.data.steamId;
}
