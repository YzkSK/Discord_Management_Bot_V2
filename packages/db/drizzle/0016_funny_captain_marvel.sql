ALTER TABLE "recruitment_participants" ADD COLUMN "is_queued" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recruitment_participants" ADD COLUMN "queued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recruitments" DROP COLUMN "auto_close";--> statement-breakpoint
ALTER TABLE "recruitments" DROP COLUMN "auto_closed";