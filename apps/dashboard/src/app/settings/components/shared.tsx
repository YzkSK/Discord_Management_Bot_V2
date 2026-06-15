"use client";

import type { DashboardSettingsFeatures } from "@discord-bot/shared";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import type { getDashboardLocale } from "../../../lib/locale";
import type { DashboardAccessGrant } from "../access-grants";

export interface DiscordRole {
  id: string;
  name: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
}

export interface SettingsResponse {
  guildId: string;
  guildName: string | null;
  isActive?: boolean;
  logMode: string;
  language: string;
  updatedAt: string;
  accessRole: string;
  dashboardManagementRoleIds: string[];
  features: DashboardSettingsFeatures;
  availableRoles?: DiscordRole[];
  availableTextChannels: DiscordChannel[];
  availableVoiceChannels: DiscordChannel[];
  availableCategories: DiscordChannel[];
}

export interface TtsDictionaryEntry {
  fromText: string;
  guildId: string;
  isEnabled: boolean;
  priority: number;
  scope: "guild" | "user";
  toText: string;
  userId: string | null;
}

export interface TtsSpeakerSetting {
  guildId: string;
  speakerId: number;
  userId: string | null;
}

export interface TtsSettingsResponse {
  accessRole: string;
  dictionaryEntries: TtsDictionaryEntry[];
  guildDefaultSpeaker: TtsSpeakerSetting | null;
  guildId: string;
  userSpeakers: TtsSpeakerSetting[];
}

export type DashboardLoc = ReturnType<typeof getDashboardLocale>;

export function ChannelSelect({
  value,
  onChange,
  channels,
  placeholder
}: {
  value: string;
  onChange: (val: string) => void;
  channels: DiscordChannel[];
  placeholder?: string;
}) {
  if (channels.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Channel ID"}
      />
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <option value="">-- {placeholder ?? "チャンネルを選択"} --</option>
      {channels.map((ch) => (
        <option key={ch.id} value={ch.id}>
          #{ch.name}
        </option>
      ))}
    </select>
  );
}

export function FeatureStatus({
  configured,
  label,
  loc
}: {
  configured: boolean;
  label: string;
  loc: DashboardLoc;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      <Badge variant={configured ? "success" : "outline"}>
        {configured ? loc.configured : loc.notConfigured}
      </Badge>
    </div>
  );
}

export function accessGrantKey(grant: {
  guildId: string;
  targetType: string;
  targetId: string;
}) {
  return `${grant.guildId}:${grant.targetType}:${grant.targetId}`;
}

export function ttsDictionaryKey(entry: TtsDictionaryEntry) {
  return `${entry.guildId}:${entry.scope}:${entry.userId ?? ""}:${entry.fromText}`;
}

export function formatGrantTarget(grant: DashboardAccessGrant, roles: DiscordRole[] | undefined) {
  if (grant.targetType === "role") {
    const role = roles?.find((item) => item.id === grant.targetId);
    return role ? `${role.name} (${grant.targetId})` : grant.targetId;
  }
  return grant.targetId;
}
