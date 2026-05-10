CREATE TABLE "dashboard_access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_access_grants_target_type_check" CHECK ("dashboard_access_grants"."target_type" in ('user', 'role')),
	CONSTRAINT "dashboard_access_grants_role_check" CHECK ("dashboard_access_grants"."role" in ('viewer', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_access_grants_guild_target_idx" ON "dashboard_access_grants" USING btree ("guild_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "dashboard_access_grants_guild_id_idx" ON "dashboard_access_grants" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "dashboard_access_grants_target_idx" ON "dashboard_access_grants" USING btree ("target_type","target_id");