import { unzipSync } from "fflate";

export type Play = {
  artist: string;
  track: string;
  endedAt: number;
  ms: number;
  skipped: boolean | null;
};

export type ExportFile = { name: string; data: Uint8Array };

export class SpotifyExportError extends Error {
  constructor(readonly code: "no_history" | "invalid") {
    super(code);
  }
}

const EXTENDED_FILE = /(^|\/)Streaming_History_Audio[^/]*\.json$/i;
const BASIC_FILE = /(^|\/)StreamingHistory(_music_?)?\d*\.json$/i;

/** Anything else in the export, like identity or payment data, is never even unpacked. */
export function isHistoryFileName(name: string) {
  return EXTENDED_FILE.test(name) || BASIC_FILE.test(name);
}

type RawRecord = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseExtended(record: RawRecord): Play | null {
  // Listening in a private session was hidden on purpose, so it stays out of the roast.
  if (record.incognito_mode === true) return null;

  const artist = text(record.master_metadata_album_artist_name);
  const track = text(record.master_metadata_track_name);
  const endedAt = Date.parse(String(record.ts));
  const ms = record.ms_played;
  if (!artist || !track || !Number.isFinite(endedAt)) return null;
  if (typeof ms !== "number" || ms <= 0) return null;

  return {
    artist,
    track,
    endedAt,
    ms,
    skipped: typeof record.skipped === "boolean" ? record.skipped : null,
  };
}

function parseBasic(record: RawRecord): Play | null {
  const artist = text(record.artistName);
  const track = text(record.trackName);
  const endedAt = Date.parse(`${String(record.endTime).replace(" ", "T")}Z`);
  const ms = record.msPlayed;
  if (!artist || !track || !Number.isFinite(endedAt)) return null;
  if (typeof ms !== "number" || ms <= 0) return null;

  return { artist, track, endedAt, ms, skipped: null };
}

function parseRecords(json: unknown, parse: (r: RawRecord) => Play | null) {
  if (!Array.isArray(json)) throw new SpotifyExportError("invalid");
  const plays: Play[] = [];
  for (const record of json) {
    if (record && typeof record === "object") {
      const play = parse(record as RawRecord);
      if (play) plays.push(play);
    }
  }
  return plays;
}

function expandZips(files: ExportFile[]) {
  return files.flatMap((file) => {
    if (!file.name.toLowerCase().endsWith(".zip")) return [file];
    try {
      const entries = unzipSync(file.data, {
        filter: (entry) => isHistoryFileName(entry.name),
      });
      return Object.entries(entries).map(([name, data]) => ({ name, data }));
    } catch {
      throw new SpotifyExportError("invalid");
    }
  });
}

/** Reads plays from a ZIP or JSON files. The extended history wins, as it also covers the basic one. */
export function readExport(files: ExportFile[]) {
  const history = expandZips(files).filter((file) =>
    isHistoryFileName(file.name),
  );
  const extended = history.filter((file) => EXTENDED_FILE.test(file.name));
  const chosen = extended.length > 0 ? extended : history;
  if (chosen.length === 0) throw new SpotifyExportError("no_history");

  const parse = extended.length > 0 ? parseExtended : parseBasic;
  const decoder = new TextDecoder();
  const plays = chosen.flatMap((file) => {
    try {
      return parseRecords(JSON.parse(decoder.decode(file.data)), parse);
    } catch {
      throw new SpotifyExportError("invalid");
    }
  });
  if (plays.length === 0) throw new SpotifyExportError("no_history");
  return plays;
}
