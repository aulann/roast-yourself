import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roastSource = pgEnum("roast_source", [
  "steam",
  "spotify_export",
  "spotify_oauth",
]);
export const roastLocale = pgEnum("roast_locale", ["pl", "en"]);
export const roastHeat = pgEnum("roast_heat", ["mild", "spicy", "merciless"]);
export const roastStatus = pgEnum("roast_status", [
  "pending",
  "ready",
  "failed",
]);

export const roasts = pgTable(
  "roasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    source: roastSource("source").notNull(),
    locale: roastLocale("locale").notNull(),
    heat: roastHeat("heat").notNull(),
    stats: jsonb("stats").notNull(),
    slides: jsonb("slides"),
    schemaVersion: integer("schema_version").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    status: roastStatus("status").notNull().default("pending"),
    shareSlug: text("share_slug"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("roasts_user_created_idx").on(table.clerkUserId, table.createdAt),
    uniqueIndex("roasts_share_slug_idx").on(table.shareSlug),
  ],
);

export const generationUsage = pgTable(
  "generation_usage",
  {
    clerkUserId: text("clerk_user_id").notNull(),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0"),
  },
  (table) => [
    primaryKey({ columns: [table.clerkUserId, table.day] }),
    index("generation_usage_day_idx").on(table.day),
  ],
);
