CREATE TABLE "call_session_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"join_order" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_session_members_join_order_check" CHECK ("call_session_members"."join_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "call_sessions_status_check" CHECK ("call_sessions"."status" in ('active', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "temp_voice_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"creation_channel_id" text NOT NULL,
	"control_channel_id" text,
	"call_session_id" uuid,
	"delete_scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guild_configs" ADD COLUMN "temp_voice_create_channel_id" text;--> statement-breakpoint
ALTER TABLE "guild_configs" ADD COLUMN "temp_voice_category_id" text;--> statement-breakpoint
ALTER TABLE "call_session_members" ADD CONSTRAINT "call_session_members_call_session_id_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temp_voice_channels" ADD CONSTRAINT "temp_voice_channels_call_session_id_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "call_session_members_session_user_idx" ON "call_session_members" USING btree ("call_session_id","user_id");--> statement-breakpoint
CREATE INDEX "call_session_members_session_joined_idx" ON "call_session_members" USING btree ("call_session_id","joined_at");--> statement-breakpoint
CREATE INDEX "call_sessions_guild_id_idx" ON "call_sessions" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "call_sessions_channel_status_idx" ON "call_sessions" USING btree ("channel_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "temp_voice_channels_channel_id_idx" ON "temp_voice_channels" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "temp_voice_channels_guild_id_idx" ON "temp_voice_channels" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "temp_voice_channels_owner_id_idx" ON "temp_voice_channels" USING btree ("owner_id");