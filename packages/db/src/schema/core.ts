import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
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
    tempVoiceCreateChannelId: text("temp_voice_create_channel_id"),
    tempVoiceCategoryId: text("temp_voice_category_id"),
    ttsTextChannelId: text("tts_text_channel_id"),
    ttsLlmEnabled: boolean("tts_llm_enabled").notNull().default(false),
    recruitmentChannelId: text("recruitment_channel_id"),
    language: text("language").notNull().default("en"),
    dashboardManagementRoleIds: text("dashboard_management_role_ids")
      .array()
      .notNull()
      .default(sql`'{}'`),
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
    ),
    languageCheck: check(
      "guild_configs_language_check",
      sql`${table.language} in ('en', 'ja')`
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

export const callSessions = pgTable(
  "call_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    status: text("status").notNull().default("active"),
    statusMessageId: text("status_message_id"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    callSessionsGuildIdx: index("call_sessions_guild_id_idx").on(
      table.guildId
    ),
    callSessionsChannelStatusIdx: index(
      "call_sessions_channel_status_idx"
    ).on(table.channelId, table.status),
    statusCheck: check(
      "call_sessions_status_check",
      sql`${table.status} in ('active', 'ended')`
    )
  })
);

export const tempVoiceChannels = pgTable(
  "temp_voice_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    ownerId: text("owner_id").notNull(),
    creationChannelId: text("creation_channel_id").notNull(),
    controlChannelId: text("control_channel_id"),
    callSessionId: uuid("call_session_id").references(() => callSessions.id, {
      onDelete: "set null"
    }),
    deleteScheduledAt: timestamp("delete_scheduled_at", {
      withTimezone: true
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    tempVoiceChannelsChannelIdx: uniqueIndex(
      "temp_voice_channels_channel_id_idx"
    ).on(table.channelId),
    tempVoiceChannelsGuildIdx: index("temp_voice_channels_guild_id_idx").on(
      table.guildId
    ),
    tempVoiceChannelsOwnerIdx: index("temp_voice_channels_owner_id_idx").on(
      table.ownerId
    )
  })
);

export const callSessionMembers = pgTable(
  "call_session_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    callSessionId: uuid("call_session_id")
      .notNull()
      .references(() => callSessions.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinOrder: integer("join_order").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    callSessionMembersSessionUserIdx: uniqueIndex(
      "call_session_members_session_user_idx"
    ).on(table.callSessionId, table.userId),
    callSessionMembersSessionJoinedIdx: index(
      "call_session_members_session_joined_idx"
    ).on(table.callSessionId, table.joinedAt),
    joinOrderCheck: check(
      "call_session_members_join_order_check",
      sql`${table.joinOrder} >= 0`
    )
  })
);

export const recruitments = pgTable(
  "recruitments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    creatorId: text("creator_id").notNull(),
    genre: text("genre").notNull(),
    capacity: integer("capacity").notNull(),
    content: text("content").notNull(),
    voiceChannelId: text("voice_channel_id"),
    autoClose: boolean("auto_close").notNull().default(true),
    status: text("status").notNull().default("open"),
    autoClosed: boolean("auto_closed").notNull().default(false),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    recruitmentsGuildIdx: index("recruitments_guild_id_idx").on(
      table.guildId
    ),
    recruitmentsMessageIdx: uniqueIndex("recruitments_message_id_idx").on(
      table.messageId
    ),
    recruitmentsStatusIdx: index("recruitments_status_idx").on(table.status),
    capacityCheck: check(
      "recruitments_capacity_check",
      sql`${table.capacity} > 0`
    ),
    statusCheck: check(
      "recruitments_status_check",
      sql`${table.status} in ('open', 'full', 'closed')`
    )
  })
);

export const recruitmentParticipants = pgTable(
  "recruitment_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recruitmentId: uuid("recruitment_id")
      .notNull()
      .references(() => recruitments.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    recruitmentParticipantsRecruitmentUserIdx: uniqueIndex(
      "recruitment_participants_recruitment_user_idx"
    ).on(table.recruitmentId, table.userId),
    recruitmentParticipantsRecruitmentJoinedIdx: index(
      "recruitment_participants_recruitment_joined_idx"
    ).on(table.recruitmentId, table.joinedAt)
  })
);

export const ttsDictionaryEntries = pgTable(
  "tts_dictionary_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    scope: text("scope").notNull(),
    userId: text("user_id"),
    fromText: text("from_text").notNull(),
    toText: text("to_text").notNull(),
    priority: integer("priority").notNull().default(0),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    ttsDictionaryEntriesGuildIdx: index(
      "tts_dictionary_entries_guild_id_idx"
    ).on(table.guildId),
    ttsDictionaryEntriesGuildFromUniqueIdx: uniqueIndex(
      "tts_dictionary_entries_guild_from_unique_idx"
    )
      .on(table.guildId, table.fromText)
      .where(sql`${table.scope} = 'guild'`),
    ttsDictionaryEntriesUserFromUniqueIdx: uniqueIndex(
      "tts_dictionary_entries_user_from_unique_idx"
    )
      .on(table.guildId, table.userId, table.fromText)
      .where(sql`${table.scope} = 'user'`),
    scopeCheck: check(
      "tts_dictionary_entries_scope_check",
      sql`${table.scope} in ('guild', 'user')`
    ),
    userScopeCheck: check(
      "tts_dictionary_entries_user_scope_check",
      sql`(${table.scope} = 'guild' and ${table.userId} is null) or (${table.scope} = 'user' and ${table.userId} is not null)`
    ),
    priorityCheck: check(
      "tts_dictionary_entries_priority_check",
      sql`${table.priority} >= 0`
    )
  })
);

export const ttsSpeakerSettings = pgTable(
  "tts_speaker_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id"),
    speakerId: integer("speaker_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => ({
    ttsSpeakerSettingsGuildIdx: index(
      "tts_speaker_settings_guild_id_idx"
    ).on(table.guildId),
    ttsSpeakerSettingsGuildDefaultUniqueIdx: uniqueIndex(
      "tts_speaker_settings_guild_default_unique_idx"
    )
      .on(table.guildId)
      .where(sql`${table.userId} is null`),
    ttsSpeakerSettingsUserUniqueIdx: uniqueIndex(
      "tts_speaker_settings_user_unique_idx"
    )
      .on(table.guildId, table.userId)
      .where(sql`${table.userId} is not null`),
    speakerIdCheck: check(
      "tts_speaker_settings_speaker_id_check",
      sql`${table.speakerId} >= 0`
    )
  })
);
