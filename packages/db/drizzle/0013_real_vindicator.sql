CREATE TABLE "discord_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "discord_channels_channel_id_idx" ON "discord_channels" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "discord_channels_guild_id_idx" ON "discord_channels" USING btree ("guild_id");