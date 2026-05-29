CREATE TABLE "tts_speaker_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text,
	"speaker_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tts_speaker_settings_speaker_id_check" CHECK ("tts_speaker_settings"."speaker_id" >= 0)
);
--> statement-breakpoint
CREATE INDEX "tts_speaker_settings_guild_id_idx" ON "tts_speaker_settings" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tts_speaker_settings_guild_default_unique_idx" ON "tts_speaker_settings" USING btree ("guild_id") WHERE "tts_speaker_settings"."user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "tts_speaker_settings_user_unique_idx" ON "tts_speaker_settings" USING btree ("guild_id","user_id") WHERE "tts_speaker_settings"."user_id" is not null;