import { computeSteamStats } from "@/sources/steam/stats";
import { buildSteamDeck } from "./deck";

// A fictional player with fictional games, so the demo needs no account and no real titles.
const DEMO_NOW = 1_790_000_000;
const YEAR = 365 * 24 * 60 * 60;

function played(appid: number, name: string, hours: number, yearsAgo = 0) {
  return {
    appid,
    name,
    playtime_forever: hours * 60,
    rtime_last_played: DEMO_NOW - Math.round(yearsAgo * YEAR),
  };
}

const unplayed = Array.from({ length: 142 }, (_, index) => ({
  appid: 1000 + index,
  name: `Bundle Filler ${index + 1}`,
  playtime_forever: 0,
}));

const dropped = Array.from({ length: 37 }, (_, index) => ({
  appid: 2000 + index,
  name: `Tutorial Survivor ${index + 1}`,
  playtime_forever: 25,
  rtime_last_played: DEMO_NOW - 2 * YEAR,
}));

const games = [
  played(1, "Spreadsheet Empire IV", 1840),
  played(2, "Goat Tycoon Online", 612, 0.1),
  played(3, "Extremely Serious Farming", 288),
  played(4, "Dark Souls-ish", 96, 3),
  played(5, "Virtual Queue Simulator", 41, 2),
  { ...played(6, "Elder Quest: Unfinished", 402, 4) },
  ...unplayed,
  ...dropped,
].map((game) =>
  game.appid === 1 ? { ...game, playtime_2weeks: 54 * 60 } : game,
);

export const DEMO_DECK = buildSteamDeck(
  "xX_Backlog_Xx",
  computeSteamStats(games, DEMO_NOW),
  DEMO_NOW,
);
