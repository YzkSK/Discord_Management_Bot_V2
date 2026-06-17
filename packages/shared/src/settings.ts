import { isGuildLanguage, type GuildLanguage } from "./locale.js";

export const RECRUITMENT_DEADLINE_DEFAULT_DAYS = 7;
export const RECRUITMENT_DEADLINE_MAX_DAYS = 30;
export const REOPEN_DEADLINE_HOURS = 24;
export const COUNTDOWN_THRESHOLD_24H_MS = 24 * 60 * 60 * 1000;
export const COUNTDOWN_THRESHOLD_1H_MS = 60 * 60 * 1000;
export const RECRUITMENT_SCHEDULER_INTERVAL_MS = 60_000;

export const dashboardLogModes = ["full", "metadata_only", "disabled"] as const;
export type DashboardLogMode = (typeof dashboardLogModes)[number];

export const dashboardSettingSections = [
  "logs",
  "tempVc",
  "recruitment",
  "tts"
] as const;
export type DashboardSettingSection = (typeof dashboardSettingSections)[number];

export interface DashboardSettingsFeatureInput {
  logMode: string;
  language: string;
  tempVoiceCreateChannelId: string | null;
  tempVoiceCategoryId: string | null;
  ttsTextChannelId: string | null;
  recruitmentChannelId: string | null;
}

export interface DashboardSettingsFeatures {
  logs: {
    logMode: DashboardLogMode;
    language: GuildLanguage;
  };
  tempVc: {
    createChannelId: string | null;
    categoryId: string | null;
    configured: boolean;
  };
  recruitment: {
    channelId: string | null;
    configured: boolean;
  };
  tts: {
    textChannelId: string | null;
    configured: boolean;
  };
}

export function buildDashboardSettingsFeatures(
  input: DashboardSettingsFeatureInput
): DashboardSettingsFeatures {
  const logMode = isDashboardLogMode(input.logMode) ? input.logMode : "full";
  const language = isGuildLanguage(input.language) ? input.language : "en";

  return {
    logs: {
      logMode,
      language
    },
    tempVc: {
      createChannelId: input.tempVoiceCreateChannelId,
      categoryId: input.tempVoiceCategoryId,
      configured: Boolean(input.tempVoiceCreateChannelId)
    },
    recruitment: {
      channelId: input.recruitmentChannelId,
      configured: Boolean(input.recruitmentChannelId)
    },
    tts: {
      textChannelId: input.ttsTextChannelId,
      configured: Boolean(input.ttsTextChannelId)
    }
  };
}

export function isDashboardLogMode(value: string): value is DashboardLogMode {
  return dashboardLogModes.includes(value as DashboardLogMode);
}
