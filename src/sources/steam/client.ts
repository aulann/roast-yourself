import { z } from "zod";

const API_ROOT = "https://api.steampowered.com";
const PUBLIC_PROFILE = 3;

const summariesSchema = z.object({
  response: z.object({
    players: z.array(
      z.object({
        personaname: z.string(),
        communityvisibilitystate: z.number(),
      }),
    ),
  }),
});

const steamGameSchema = z.object({
  appid: z.number(),
  name: z.string().optional(),
  playtime_forever: z.number(),
  playtime_2weeks: z.number().optional(),
  rtime_last_played: z.number().optional(),
});

const ownedGamesSchema = z.object({
  response: z.object({
    game_count: z.number().optional(),
    games: z.array(steamGameSchema).optional(),
  }),
});

export type SteamGame = z.infer<typeof steamGameSchema>;

export type SteamProfile =
  | { status: "not_found" }
  | { status: "private"; name: string }
  | { status: "ok"; name: string; games: SteamGame[] };

export class SteamApiError extends Error {}

async function callSteam(
  path: string,
  params: Record<string, string>,
  fetchFn: typeof fetch,
) {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new SteamApiError("STEAM_WEB_API_KEY is not set");

  const query = new URLSearchParams({ key, format: "json", ...params });
  const response = await fetchFn(`${API_ROOT}${path}?${query}`, {
    signal: AbortSignal.timeout(10_000),
  });
  // The URL holds the API key, so it must stay out of error messages.
  if (!response.ok) {
    throw new SteamApiError(`Steam API ${path} returned ${response.status}`);
  }
  return response.json();
}

export async function fetchSteamProfile(
  steamId: string,
  fetchFn: typeof fetch = fetch,
): Promise<SteamProfile> {
  const [summaries, owned] = await Promise.all([
    callSteam(
      "/ISteamUser/GetPlayerSummaries/v2/",
      { steamids: steamId },
      fetchFn,
    ),
    callSteam(
      "/IPlayerService/GetOwnedGames/v1/",
      {
        steamid: steamId,
        include_appinfo: "true",
        include_played_free_games: "true",
      },
      fetchFn,
    ),
  ]);

  const player = summariesSchema.parse(summaries).response.players[0];
  if (!player) return { status: "not_found" };

  const { game_count: gameCount, games } = ownedGamesSchema.parse(owned).response;
  // Steam sends an empty response, not an error, when game details are hidden.
  if (
    player.communityvisibilitystate !== PUBLIC_PROFILE ||
    gameCount === undefined
  ) {
    return { status: "private", name: player.personaname };
  }

  return { status: "ok", name: player.personaname, games: games ?? [] };
}
