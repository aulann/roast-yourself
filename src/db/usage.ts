import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "./index";
import { generationUsage } from "./schema";

export const DAILY_ROAST_LIMIT = 3;

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Atomic, so parallel requests cannot slip past the limit. */
export async function reserveGeneration(userId: string) {
  const rows = await getDb()
    .insert(generationUsage)
    .values({ clerkUserId: userId, day: today(), count: 1 })
    .onConflictDoUpdate({
      target: [generationUsage.clerkUserId, generationUsage.day],
      set: { count: sql`${generationUsage.count} + 1` },
      where: lt(generationUsage.count, DAILY_ROAST_LIMIT),
    })
    .returning({ count: generationUsage.count });
  return rows.length > 0;
}

export async function releaseGeneration(userId: string) {
  await getDb()
    .update(generationUsage)
    .set({ count: sql`greatest(${generationUsage.count} - 1, 0)` })
    .where(
      and(
        eq(generationUsage.clerkUserId, userId),
        eq(generationUsage.day, today()),
      ),
    );
}

export async function addGenerationCost(userId: string, costUsd: number) {
  await getDb()
    .update(generationUsage)
    .set({ costUsd: sql`${generationUsage.costUsd} + ${costUsd}` })
    .where(
      and(
        eq(generationUsage.clerkUserId, userId),
        eq(generationUsage.day, today()),
      ),
    );
}

/** Without a configured budget nothing is generated, so a missing variable cannot cost money. */
export async function hasMonthlyBudget() {
  const budget = Number(process.env.MONTHLY_BUDGET_USD);
  if (!Number.isFinite(budget) || budget <= 0) return false;

  const monthStart = `${today().slice(0, 7)}-01`;
  const [{ spent }] = await getDb()
    .select({ spent: sql<string>`coalesce(sum(${generationUsage.costUsd}), 0)` })
    .from(generationUsage)
    .where(gte(generationUsage.day, monthStart));
  return Number(spent) < budget;
}
