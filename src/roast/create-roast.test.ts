import { describe, expect, it, vi } from "vitest";
import { createSteamRoast, type CreateRoastDeps } from "./create-roast";
import { RoastGenerationError } from "./generate";

const NOW = 2_000_000_000;
const INPUT: Parameters<typeof createSteamRoast>[0] = {
  heat: "spicy",
  locale: "pl",
  excludedAppIds: [],
  nowSeconds: NOW,
};

const GAMES = [
  { appid: 1, name: "Keep", playtime_forever: 600 },
  { appid: 2, name: "Embarrassing", playtime_forever: 6000 },
];

function deps(overrides: Partial<CreateRoastDeps> = {}) {
  return {
    hasBudget: vi.fn(async () => true),
    reserve: vi.fn(async () => true),
    release: vi.fn(async () => {}),
    addCost: vi.fn(async () => {}),
    fetchProfile: vi.fn(async () => ({
      status: "ok" as const,
      name: "Gracz",
      games: GAMES,
    })),
    generate: vi.fn(async () => ({ copy: {}, costUsd: 0.001 })),
    save: vi.fn(async () => "roast-id"),
    ...overrides,
  } satisfies CreateRoastDeps;
}

describe("createSteamRoast", () => {
  it("saves the roast and records its cost", async () => {
    const d = deps();
    expect(await createSteamRoast(INPUT, d)).toEqual({
      status: "ok",
      id: "roast-id",
    });
    expect(d.addCost).toHaveBeenCalledWith(0.001);
    expect(d.release).not.toHaveBeenCalled();
  });

  it("stops before spending when the budget is gone", async () => {
    const d = deps({ hasBudget: vi.fn(async () => false) });
    expect(await createSteamRoast(INPUT, d)).toEqual({ status: "budget" });
    expect(d.reserve).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("stops before spending when the daily limit is reached", async () => {
    const d = deps({ reserve: vi.fn(async () => false) });
    expect(await createSteamRoast(INPUT, d)).toEqual({ status: "limit" });
    expect(d.generate).not.toHaveBeenCalled();
    expect(d.release).not.toHaveBeenCalled();
  });

  it("gives the limit back when the profile is hidden", async () => {
    const d = deps({
      fetchProfile: vi.fn(async () => ({
        status: "private" as const,
        name: "Gracz",
      })),
    });
    expect(await createSteamRoast(INPUT, d)).toEqual({ status: "unavailable" });
    expect(d.release).toHaveBeenCalledOnce();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("gives the limit back but keeps the cost when the model fails", async () => {
    const d = deps({
      generate: vi.fn(async () => {
        throw new RoastGenerationError("bad", 0.002);
      }),
    });
    expect(await createSteamRoast(INPUT, d)).toEqual({ status: "failed" });
    expect(d.release).toHaveBeenCalledOnce();
    expect(d.addCost).toHaveBeenCalledWith(0.002);
    expect(d.save).not.toHaveBeenCalled();
  });

  it("never sends excluded games to the model", async () => {
    const generate = vi.fn(async () => ({ copy: {}, costUsd: 0.001 }));
    const save = vi.fn(async () => "roast-id");
    await createSteamRoast(
      { ...INPUT, excludedAppIds: [2] },
      deps({ generate, save }),
    );
    expect(JSON.stringify(generate.mock.calls[0])).not.toContain("Embarrassing");
    expect(JSON.stringify(save.mock.calls[0])).not.toContain("Embarrassing");
  });
});
