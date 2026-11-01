import { describe, expect, it, vi } from "vitest";
import { createRoast, type CreateRoastDeps } from "./create-roast";
import { RoastGenerationError } from "./generate";

function deps(overrides: Partial<CreateRoastDeps<string>> = {}) {
  return {
    hasBudget: vi.fn(async () => true),
    reserve: vi.fn(async () => true),
    release: vi.fn(async () => {}),
    addCost: vi.fn(async () => {}),
    prepare: vi.fn(async () => ({ stats: "stats", deck: [] })),
    generate: vi.fn(async () => ({ copy: {}, costUsd: 0.001 })),
    save: vi.fn(async () => "roast-id"),
    ...overrides,
  } satisfies CreateRoastDeps<string>;
}

describe("createRoast", () => {
  it("saves the roast and records its cost", async () => {
    const d = deps();
    expect(await createRoast(d)).toEqual({ status: "ok", id: "roast-id" });
    expect(d.addCost).toHaveBeenCalledWith(0.001);
    expect(d.release).not.toHaveBeenCalled();
  });

  it("stops before spending when the budget is gone", async () => {
    const d = deps({ hasBudget: vi.fn(async () => false) });
    expect(await createRoast(d)).toEqual({ status: "budget" });
    expect(d.reserve).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("stops before spending when the daily limit is reached", async () => {
    const d = deps({ reserve: vi.fn(async () => false) });
    expect(await createRoast(d)).toEqual({ status: "limit" });
    expect(d.generate).not.toHaveBeenCalled();
    expect(d.release).not.toHaveBeenCalled();
  });

  it("gives the limit back when there is nothing to review", async () => {
    const d = deps({ prepare: vi.fn(async () => null) });
    expect(await createRoast(d)).toEqual({ status: "unavailable" });
    expect(d.release).toHaveBeenCalledOnce();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("gives the limit back but keeps the cost when the model fails", async () => {
    const d = deps({
      generate: vi.fn(async () => {
        throw new RoastGenerationError("bad", 0.002);
      }),
    });
    expect(await createRoast(d)).toEqual({ status: "failed" });
    expect(d.release).toHaveBeenCalledOnce();
    expect(d.addCost).toHaveBeenCalledWith(0.002);
    expect(d.save).not.toHaveBeenCalled();
  });
});
