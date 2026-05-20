CREATE TABLE "recruitment_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recruitment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"creator_id" text NOT NULL,
	"genre" text NOT NULL,
	"capacity" integer NOT NULL,
	"content" text NOT NULL,
	"voice_channel_id" text,
	"auto_close" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"auto_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruitments_capacity_check" CHECK ("recruitments"."capacity" > 0),
	CONSTRAINT "recruitments_status_check" CHECK ("recruitments"."status" in ('open', 'full', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "recruitment_participants" ADD CONSTRAINT "recruitment_participants_recruitment_id_recruitments_id_fk" FOREIGN KEY ("recruitment_id") REFERENCES "public"."recruitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recruitment_participants_recruitment_user_idx" ON "recruitment_participants" USING btree ("recruitment_id","user_id");--> statement-breakpoint
CREATE INDEX "recruitment_participants_recruitment_joined_idx" ON "recruitment_participants" USING btree ("recruitment_id","joined_at");--> statement-breakpoint
CREATE INDEX "recruitments_guild_id_idx" ON "recruitments" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recruitments_message_id_idx" ON "recruitments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "recruitments_status_idx" ON "recruitments" USING btree ("status");