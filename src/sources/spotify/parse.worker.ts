import { readExport, SpotifyExportError, type Play } from "./parse";
import { computeSpotifyStats, type Exclusions } from "./stats";

export type WorkerRequest =
  | { type: "parse"; files: File[]; timeZone: string }
  | { type: "exclude"; exclusions: Exclusions };

export type WorkerResponse =
  | { type: "stats"; stats: ReturnType<typeof computeSpotifyStats> }
  | { type: "error"; code: "no_history" | "invalid" | "too_large" };

// A generous limit: unpacking anything larger would likely crash the browser tab.
const MAX_FILE_BYTES = 800 * 1024 * 1024;

let plays: Play[] = [];
let timeZone = "UTC";

function reply(message: WorkerResponse) {
  self.postMessage(message);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === "exclude") {
    reply({
      type: "stats",
      stats: computeSpotifyStats(plays, timeZone, data.exclusions),
    });
    return;
  }

  try {
    if (data.files.some((file) => file.size > MAX_FILE_BYTES)) {
      reply({ type: "error", code: "too_large" });
      return;
    }
    const files = await Promise.all(
      data.files.map(async (file) => ({
        name: file.name,
        data: new Uint8Array(await file.arrayBuffer()),
      })),
    );
    plays = readExport(files);
    timeZone = data.timeZone;
    reply({ type: "stats", stats: computeSpotifyStats(plays, timeZone) });
  } catch (error) {
    reply({
      type: "error",
      code: error instanceof SpotifyExportError ? error.code : "invalid",
    });
  }
};
