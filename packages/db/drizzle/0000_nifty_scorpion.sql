CREATE TABLE "guild_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_ref_id" uuid NOT NULL,
	"log_mode" text DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guild_configs_log_mode_check" CHECK ("guild_configs"."log_mode" in ('full', 'metadata_only', 'disabled'))
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"guild_id" text,
	"actor_id" text,
	"channel_id" text,
	"message_id" text,
	"event_timestamp" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"realtime_enabled" boolean DEFAULT false NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guild_configs" ADD CONSTRAINT "guild_configs_guild_ref_id_guilds_id_fk" FOREIGN KEY ("guild_ref_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guild_configs_guild_ref_id_idx" ON "guild_configs" USING btree ("guild_ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guilds_guild_id_idx" ON "guilds" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "logs_event_name_idx" ON "logs" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "logs_guild_id_idx" ON "logs" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "logs_actor_id_idx" ON "logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "logs_channel_id_idx" ON "logs" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "logs_received_at_idx" ON "logs" USING btree ("received_at");