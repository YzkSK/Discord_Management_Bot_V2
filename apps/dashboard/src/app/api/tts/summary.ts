import type { TtsDictionaryScope } from "@discord-bot/db";

export interface TtsSummaryInput {
  dictionaryEntries: TtsSummaryDictionaryInput[];
  guildDefaultSpeaker: TtsSummarySpeakerInput | null;
  guildId: string;
  ttsTextChannelId: string | null;
  userSpeakers: Array<TtsSummarySpeakerInput & { userId: string }>;
}

export interface TtsSummaryDictionaryInput {
  fromText: string;
  guildId: string;
  isEnabled: boolean;
  priority: number;
  scope: TtsDictionaryScope;
  toText: string;
  updatedAt: Date;
  userId: string | null;
}

export interface TtsSummarySpeakerInput {
  guildId: string;
  speakerId: number;
  updatedAt: Date;
  userId: string | null;
}

export interface TtsSummary {
  dictionaryEntries: TtsSummaryDictionaryEntry[];
  dictionaryStats: {
    disabledCount: number;
    enabledCount: number;
    guildCount: number;
    totalCount: number;
    userCount: number;
  };
  guildDefaultSpeaker: {
    speakerId: number;
    updatedAt: string;
  } | null;
  guildId: string;
  isConfigured: boolean;
  ttsTextChannelId: string | null;
  userSpeakerCount: number;
  userSpeakers: TtsSummaryUserSpeaker[];
}

export interface TtsSummaryDictionaryEntry {
  fromText: string;
  isEnabled: boolean;
  priority: number;
  scope: TtsDictionaryScope;
  toText: string;
  updatedAt: string;
  userId: string | null;
}

export interface TtsSummaryUserSpeaker {
  speakerId: number;
  updatedAt: string;
  userId: string;
}

export function buildTtsSummary(input: TtsSummaryInput): TtsSummary {
  const dictionaryEntries = input.dictionaryEntries.map((entry) => ({
    fromText: entry.fromText,
    isEnabled: entry.isEnabled,
    priority: entry.priority,
    scope: entry.scope,
    toText: entry.toText,
    updatedAt: entry.updatedAt.toISOString(),
    userId: entry.userId
  }));
  const userSpeakers = input.userSpeakers.map((speaker) => ({
    speakerId: speaker.speakerId,
    updatedAt: speaker.updatedAt.toISOString(),
    userId: speaker.userId
  }));

  return {
    dictionaryEntries,
    dictionaryStats: {
      disabledCount: dictionaryEntries.filter((entry) => !entry.isEnabled)
        .length,
      enabledCount: dictionaryEntries.filter((entry) => entry.isEnabled).length,
      guildCount: dictionaryEntries.filter((entry) => entry.scope === "guild")
        .length,
      totalCount: dictionaryEntries.length,
      userCount: dictionaryEntries.filter((entry) => entry.scope === "user")
        .length
    },
    guildDefaultSpeaker: input.guildDefaultSpeaker
      ? {
          speakerId: input.guildDefaultSpeaker.speakerId,
          updatedAt: input.guildDefaultSpeaker.updatedAt.toISOString()
        }
      : null,
    guildId: input.guildId,
    isConfigured: Boolean(input.ttsTextChannelId),
    ttsTextChannelId: input.ttsTextChannelId,
    userSpeakerCount: userSpeakers.length,
    userSpeakers
  };
}
