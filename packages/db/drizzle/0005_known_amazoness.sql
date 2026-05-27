ALTER TABLE "guild_configs" ADD COLUMN "language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "guild_configs" ADD CONSTRAINT "guild_configs_language_check" CHECK ("guild_configs"."language" in ('en', 'ja'));
