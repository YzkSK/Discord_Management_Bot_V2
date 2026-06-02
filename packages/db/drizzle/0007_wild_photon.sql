CREATE TABLE "tts_dictionary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"scope" text NOT NULL,
	"user_id" text,
	"from_text" text NOT NULL,
	"to_text" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tts_dictionary_entries_scope_check" CHECK ("tts_dictionary_entries"."scope" in ('guild', 'user')),
	CONSTRAINT "tts_dictionary_entries_user_scope_check" CHECK (("tts_dictionary_entries"."scope" = 'guild' and "tts_dictionary_entries"."user_id" is null) or ("tts_dictionary_entries"."scope" = 'user' and "tts_dictionary_entries"."user_id" is not null)),
	CONSTRAINT "tts_dictionary_entries_priority_check" CHECK ("tts_dictionary_entries"."priority" >= 0)
);
--> statement-breakpoint
CREATE INDEX "tts_dictionary_entries_guild_id_idx" ON "tts_dictionary_entries" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tts_dictionary_entries_guild_from_unique_idx" ON "tts_dictionary_entries" USING btree ("guild_id","from_text") WHERE "tts_dictionary_entries"."scope" = 'guild';--> statement-breakpoint
CREATE UNIQUE INDEX "tts_dictionary_entries_user_from_unique_idx" ON "tts_dictionary_entries" USING btree ("guild_id","user_id","from_text") WHERE "tts_dictionary_entries"."scope" = 'user';