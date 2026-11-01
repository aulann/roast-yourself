import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSteamLink, readSteamLink, STEAM_LINK_MAX_AGE } from "./link";

beforeEach(() => {
  vi.stubEnv("STEAM_LINK_SECRET", "test-secret");
});

describe("steam link", () => {
  it("gives the SteamID back to the same user", () => {
    const token = createSteamLink("user_1", "123", 1000);
    expect(readSteamLink(token, "user_1", 1000)).toBe("123");
  });

  it("does not work for another signed-in user", () => {
    const token = createSteamLink("user_1", "123", 1000);
    expect(readSteamLink(token, "user_2", 1000)).toBeNull();
  });

  it("expires", () => {
    const token = createSteamLink("user_1", "123", 0);
    expect(readSteamLink(token, "user_1", STEAM_LINK_MAX_AGE * 1000)).toBeNull();
  });
});
