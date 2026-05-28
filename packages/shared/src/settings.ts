import { isGuildLanguage, type GuildLanguage } from "./locale.js";

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
    channelMarker: string;
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
      channelMarker: "[discord-management-bot:recruitment]",
      configured: false
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
