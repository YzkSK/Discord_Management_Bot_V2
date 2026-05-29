import type { DashboardSettingsFeatures } from "@discord-bot/shared";

export type SettingsSectionKey = "logs" | "tempVc" | "tts" | "recruitment";

export interface SettingsSectionSummary {
  key: SettingsSectionKey;
  configured: boolean;
}

export function buildSettingsSectionSummaries(
  features: DashboardSettingsFeatures
): SettingsSectionSummary[] {
  return [
    {
      key: "logs",
      configured: true
    },
    {
      key: "tempVc",
      configured: features.tempVc.configured
    },
    {
      key: "tts",
      configured: features.tts.configured
    },
    {
      key: "recruitment",
      configured: features.recruitment.configured
    }
  ];
}
