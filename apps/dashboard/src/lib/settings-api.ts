import type { SettingsResponse } from "../app/settings/components/shared";

export type { SettingsResponse };

export async function fetchSettings(guildId: string): Promise<SettingsResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/settings?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

export async function updateSettings(
  guildId: string,
  logMode: string,
  language: string
): Promise<SettingsResponse> {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode, language }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
  if (!r.ok) throw new Error(`Failed to save settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

export async function updateTempVcSettings(
  guildId: string,
  createChannelId: string,
  categoryId: string
): Promise<SettingsResponse> {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({
      guildId,
      section: "tempVc",
      values: { createChannelId, categoryId },
    }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
  if (!r.ok) throw new Error(`Failed to save Temp VC settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

export async function updateTtsSettings(
  guildId: string,
  textChannelId: string
): Promise<SettingsResponse> {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({
      guildId,
      section: "tts",
      values: { textChannelId },
    }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
  if (!r.ok) throw new Error(`Failed to save TTS settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

export async function updateRecruitmentSettings(
  guildId: string,
  values: { channelId: string | null }
): Promise<SettingsResponse> {
  const r = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guildId, section: "recruitment", values }),
  });
  if (!r.ok) throw new Error("Failed to save recruitment settings");
  return (await r.json()) as SettingsResponse;
}

export function toSettingsError(e: unknown): string {
  return e instanceof Error ? e.message : "Settings request failed";
}
