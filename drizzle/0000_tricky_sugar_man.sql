CREATE TYPE "public"."roast_heat" AS ENUM('mild', 'spicy', 'merciless');--> statement-breakpoint
CREATE TYPE "public"."roast_locale" AS ENUM('pl', 'en');--> statement-breakpoint
CREATE TYPE "public"."roast_source" AS ENUM('spotify_export', 'spotify_oauth');--> statement-breakpoint
CREATE TYPE "public"."roast_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "generation_usage" (
	"clerk_user_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	CONSTRAINT "generation_usage_clerk_user_id_day_pk" PRIMARY KEY("clerk_user_id","day")
);
--> statement-breakpoint
CREATE TABLE "roasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"source" "roast_source" NOT NULL,
	"locale" "roast_locale" NOT NULL,
	"heat" "roast_heat" NOT NULL,
	"stats" jsonb NOT NULL,
	"slides" jsonb,
	"schema_version" integer NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"status" "roast_status" DEFAULT 'pending' NOT NULL,
	"share_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "generation_usage_day_idx" ON "generation_usage" USING btree ("day");--> statement-breakpoint
CREATE INDEX "roasts_user_created_idx" ON "roasts" USING btree ("clerk_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "roasts_share_slug_idx" ON "roasts" USING btree ("share_slug");