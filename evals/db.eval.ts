import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "../src/db";
import { getOwnRoast, listOwnRoasts, saveRoast } from "../src/db/roasts";
import { generationUsage, roasts } from "../src/db/schema";
import {
  addGenerationCost,
  DAILY_ROAST_LIMIT,
  hasMonthlyBudget,
  releaseGeneration,
  reserveGeneration,
} from "../src/db/usage";

const USER = `test_${randomUUID()}`;
const OTHER_USER = `test_${randomUUID()}`;

afterAll(async () => {
  for (const id of [USER, OTHER_USER]) {
    await getDb().delete(roasts).where(eq(roasts.clerkUserId, id));
    await getDb()
      .delete(generationUsage)
      .where(eq(generationUsage.clerkUserId, id));
  }
});

async function usageOf(id: string) {
  const [row] = await getDb()
    .select()
    .from(generationUsage)
    .where(eq(generationUsage.clerkUserId, id));
  return row;
}

describe("database", () => {
  it("lets parallel requests past the limit only as many times as allowed", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => reserveGeneration(USER)),
    );
    expect(results.filter(Boolean)).toHaveLength(DAILY_ROAST_LIMIT);
    expect((await usageOf(USER)).count).toBe(DAILY_ROAST_LIMIT);
  });

  it("frees a place after a failed generation", async () => {
    await releaseGeneration(USER);
    expect((await usageOf(USER)).count).toBe(DAILY_ROAST_LIMIT - 1);
    expect(await reserveGeneration(USER)).toBe(true);
    expect(await reserveGeneration(USER)).toBe(false);
  });

  it("adds up costs", async () => {
    await addGenerationCost(USER, 0.0012);
    await addGenerationCost(USER, 0.0003);
    expect(Number((await usageOf(USER)).costUsd)).toBeCloseTo(0.0015, 6);
  });

  it("stops at the monthly budget and when no budget is set", async () => {
    const budget = process.env.MONTHLY_BUDGET_USD;
    try {
      process.env.MONTHLY_BUDGET_USD = "1000";
      expect(await hasMonthlyBudget()).toBe(true);
      process.env.MONTHLY_BUDGET_USD = "0.0001";
      expect(await hasMonthlyBudget()).toBe(false);
      delete process.env.MONTHLY_BUDGET_USD;
      expect(await hasMonthlyBudget()).toBe(false);
    } finally {
      process.env.MONTHLY_BUDGET_USD = budget;
    }
  });

  it("shows a roast only to its owner", async () => {
    const id = await saveRoast({
      userId: USER,
      source: "steam",
      locale: "pl",
      heat: "spicy",
      stats: { source: "steam" },
      slides: { deck: [{ type: "recent", hours: 5 }], copy: {} },
      model: "test",
      promptVersion: "test",
    });

    expect((await getOwnRoast(id, USER))?.locale).toBe("pl");
    expect(await getOwnRoast(id, OTHER_USER)).toBeNull();
    expect(await getOwnRoast("not-a-uuid", USER)).toBeNull();
    expect(await listOwnRoasts(USER)).toHaveLength(1);
    expect(await listOwnRoasts(OTHER_USER)).toHaveLength(0);
  });
});
