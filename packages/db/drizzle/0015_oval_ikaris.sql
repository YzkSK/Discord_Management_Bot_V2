--> statement-breakpoint
-- Clean up any duplicate active sessions caused by the race condition,
-- keeping the most recently created one per (guild_id, channel_id).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY guild_id, channel_id
      ORDER BY created_at DESC
    ) AS rn
  FROM call_sessions
  WHERE status = 'active'
),
to_end AS (SELECT id FROM ranked WHERE rn > 1)
UPDATE call_sessions
SET status = 'ended', ended_at = NOW(), updated_at = NOW()
WHERE id IN (SELECT id FROM to_end);
--> statement-breakpoint
CREATE UNIQUE INDEX "call_sessions_active_channel_idx" ON "call_sessions" USING btree ("guild_id","channel_id") WHERE "call_sessions"."status" = 'active';