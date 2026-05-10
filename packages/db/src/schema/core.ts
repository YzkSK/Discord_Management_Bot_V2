import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const guilds = pgTable(
  "guilds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    name: text("name"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    guildIdIdx: uniqueIndex("guilds_guild_id_idx").on(table.guildId)
  })
);

export const guildConfigs = pgTable(
  "guild_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildRefId: uuid("guild_ref_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    logMode: text("log_mode").notNull().default("full"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    guildConfigGuildIdx: uniqueIndex("guild_configs_guild_ref_id_idx").on(
      table.guildRefId
    ),
    logModeCheck: check(
      "guild_configs_log_mode_check",
      sql`${table.logMode} in ('full', 'metadata_only', 'disabled')`
    )
  })
);

export const dashboardAccessGrants = pgTable(
  "dashboard_access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    role: text("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    dashboardAccessGrantGuildTargetIdx: uniqueIndex(
      "dashboard_access_grants_guild_target_idx"
    ).on(table.guildId, table.targetType, table.targetId),
    dashboardAccessGrantGuildIdx: index(
      "dashboard_access_grants_guild_id_idx"
    ).on(table.guildId),
    dashboardAccessGrantTargetIdx: index(
      "dashboard_access_grants_target_idx"
    ).on(table.targetType, table.targetId),
    targetTypeCheck: check(
      "dashboard_access_grants_target_type_check",
      sql`${table.targetType} in ('user', 'role')`
    ),
    roleCheck: check(
      "dashboard_access_grants_role_check",
      sql`${table.role} in ('viewer', 'admin')`
    )
  })
);

export const logs = pgTable(
  "logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventName: text("event_name").notNull(),
    guildId: text("guild_id"),
    actorId: text("actor_id"),
    channelId: text("channel_id"),
    messageId: text("message_id"),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true })
      .notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    realtimeEnabled: boolean("realtime_enabled").notNull().default(false),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`)
  },
  (table) => ({
    eventNameIdx: index("logs_event_name_idx").on(table.eventName),
    guildIdIdx: index("logs_guild_id_idx").on(table.guildId),
    actorIdIdx: index("logs_actor_id_idx").on(table.actorId),
    channelIdIdx: index("logs_channel_id_idx").on(table.channelId),
    receivedAtIdx: index("logs_received_at_idx").on(table.receivedAt)
  })
);
