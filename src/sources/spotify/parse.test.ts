import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { isHistoryFileName, readExport, SpotifyExportError } from "./parse";

function json(name: string, value: unknown) {
  return { name, data: strToU8(JSON.stringify(value)) };
}

const EXTENDED = {
  ts: "2024-03-10T22:15:00Z",
  username: "secret-user",
  ip_addr: "1.2.3.4",
  ms_played: 180000,
  master_metadata_track_name: "Song",
  master_metadata_album_artist_name: "Artist",
  skipped: true,
  incognito_mode: false,
};

const BASIC = {
  endTime: "2024-03-10 22:15",
  artistName: "Artist",
  trackName: "Song",
  msPlayed: 180000,
};

describe("isHistoryFileName", () => {
  it.each([
    "StreamingHistory0.json",
    "StreamingHistory_music_0.json",
    "Spotify Account Data/StreamingHistory_music_1.json",
    "Spotify Extended Streaming History/Streaming_History_Audio_2020-2022_1.json",
  ])("accepts %s", (name) => {
    expect(isHistoryFileName(name)).toBe(true);
  });

  it.each([
    "StreamingHistory_podcast_0.json",
    "Streaming_History_Video_2020.json",
    "Userdata.json",
    "Payments.json",
    "Identity.json",
  ])("ignores %s", (name) => {
    expect(isHistoryFileName(name)).toBe(false);
  });
});

describe("readExport", () => {
  it("reads the extended format and keeps only what the stats need", () => {
    const [play] = readExport([
      json("Streaming_History_Audio_2024.json", [EXTENDED]),
    ]);
    expect(play).toEqual({
      artist: "Artist",
      track: "Song",
      endedAt: Date.UTC(2024, 2, 10, 22, 15),
      ms: 180000,
      skipped: true,
    });
  });

  it("reads the basic format as UTC", () => {
    const [play] = readExport([json("StreamingHistory_music_0.json", [BASIC])]);
    expect(play.endedAt).toBe(Date.UTC(2024, 2, 10, 22, 15));
    expect(play.skipped).toBeNull();
  });

  it("leaves out private sessions, podcasts and broken records", () => {
    const plays = readExport([
      json("Streaming_History_Audio_2024.json", [
        EXTENDED,
        { ...EXTENDED, incognito_mode: true },
        {
          ...EXTENDED,
          master_metadata_track_name: null,
          master_metadata_album_artist_name: null,
          episode_name: "Podcast",
        },
        { ...EXTENDED, ms_played: 0 },
        { ...EXTENDED, ts: "garbage" },
        null,
      ]),
    ]);
    expect(plays).toHaveLength(1);
  });

  it("treats a missing skip value as unknown", () => {
    const [play] = readExport([
      json("Streaming_History_Audio_2024.json", [
        { ...EXTENDED, skipped: null },
      ]),
    ]);
    expect(play.skipped).toBeNull();
  });

  it("does not count plays twice when both formats are uploaded", () => {
    const plays = readExport([
      json("StreamingHistory_music_0.json", [BASIC]),
      json("Streaming_History_Audio_2024.json", [EXTENDED]),
    ]);
    expect(plays).toHaveLength(1);
  });

  it("reads several files from a ZIP, ignoring everything else", () => {
    const zip = zipSync({
      "data/Streaming_History_Audio_1.json": strToU8(JSON.stringify([EXTENDED])),
      "data/Streaming_History_Audio_2.json": strToU8(JSON.stringify([EXTENDED])),
      "data/Payments.json": strToU8("not even json"),
    });
    expect(readExport([{ name: "export.zip", data: zip }])).toHaveLength(2);
  });

  it.each([
    ["no history files", [json("Userdata.json", { a: 1 })], "no_history"],
    ["an empty history", [json("StreamingHistory0.json", [])], "no_history"],
    [
      "broken JSON",
      [{ name: "StreamingHistory0.json", data: strToU8("{oops") }],
      "invalid",
    ],
    [
      "a broken ZIP",
      [{ name: "export.zip", data: strToU8("not a zip") }],
      "invalid",
    ],
    ["the wrong shape", [json("StreamingHistory0.json", { a: 1 })], "invalid"],
  ])("explains %s", (_name, files, code) => {
    const error = (() => {
      try {
        readExport(files);
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(SpotifyExportError);
    expect((error as SpotifyExportError).code).toBe(code);
  });
});
