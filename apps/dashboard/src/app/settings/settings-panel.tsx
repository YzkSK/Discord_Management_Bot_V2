"use client";

import { useCallback, useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { fetchSettings, toSettingsError } from "../../lib/settings-api";
import { canSeeItem } from "../../lib/roles";
import { AccessGrantsTab } from "./components/AccessGrantsTab";
import { PersonalSettingsTab } from "./components/PersonalSettingsTab";
import { VoiceSettingsPanel } from "./components/VoiceSettingsPanel";
import { TtsSettingsPanel } from "./components/TtsSettingsPanel";
import { RecruitmentSettingsPanel } from "./components/RecruitmentSettingsPanel";
import { LogsSettingsPanel } from "./components/LogsSettingsPanel";
import { ErrorAlert } from "../../components/error-alert";
import { LoadingSpinner } from "../../components/loading-spinner";
import { useAccessGrants } from "./hooks/useAccessGrants";
import type { SettingsResponse } from "./components/shared";

export type { SettingsResponse };

const UI_LANG_KEY = "dashboard-ui-lang";

interface Tab {
  key: string;
  label: string;
  minRole?: "admin" | "owner";
}

const ALL_TABS: Tab[] = [
  { key: "personal",    label: "個人設定" },
  { key: "voice",       label: "Voice",        minRole: "admin" },
  { key: "tts",         label: "TTS",          minRole: "admin" },
  { key: "recruitment", label: "Recruitment",   minRole: "admin" },
  { key: "logs",        label: "Logs",          minRole: "admin" },
  { key: "access",      label: "Access",        minRole: "owner" },
];

export function SettingsPanel({
  guildId,
  role,
}: {
  guildId: string;
  role?: "viewer" | "admin" | "owner" | null;
}) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("personal");

  const loc = getDashboardLocale(uiLang);
  const isOwner = settings?.accessRole === "owner";
  const access = useAccessGrants(settings?.guildId ?? null, isOwner, loc);

  const visibleTabs = ALL_TABS.filter((tab) => canSeeItem(tab.minRole, role));

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (isGuildLanguage(stored ?? "")) setUiLang(stored as GuildLanguage);
    else setUiLang(detectBrowserLanguage());
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        access.initManagementRoles(data.dashboardManagementRoleIds);
      })
      .catch((e: unknown) => setLoadError(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;

  if (!settings) {
    return <ErrorAlert message={loadError ?? loc.failedToLoadSettings} onRetry={load} />;
  }

  return (
    <section className="max-w-3xl grid gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#1e1f22]">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-md ${
              activeTab === tab.key
                ? "border-b-2 border-[#5865f2] text-[#c9cdfb]"
                : "text-[#b5bac1] hover:text-[#dbdee1]"
            }`}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "personal" && (
        <PersonalSettingsTab
          guildId={guildId}
          uiLang={uiLang}
          onUiLangChange={setUiLang}
        />
      )}
      {activeTab === "voice" && <VoiceSettingsPanel guildId={guildId} loc={loc} />}
      {activeTab === "tts" && <TtsSettingsPanel guildId={guildId} loc={loc} />}
      {activeTab === "recruitment" && <RecruitmentSettingsPanel guildId={guildId} loc={loc} />}
      {activeTab === "logs" && (
        <LogsSettingsPanel
          guildId={guildId}
          loc={loc}
          onUiLangChange={setUiLang}
        />
      )}
      {activeTab === "access" && (
        <AccessGrantsTab
          settings={settings}
          accessGrants={access.accessGrants}
          grantTargetType={access.grantTargetType}
          grantTargetId={access.grantTargetId}
          managementRoleIds={access.managementRoleIds}
          savingGrant={access.savingGrant}
          savingRoles={access.savingRoles}
          deletingGrantKey={access.deletingGrantKey}
          confirmRoleRemoval={access.confirmRoleRemoval}
          loc={loc}
          onGrantTargetTypeChange={access.setGrantTargetType}
          onGrantTargetIdChange={access.setGrantTargetId}
          onManagementRoleChange={(id, checked) => {
            access.setManagementRoleIds((prev) =>
              checked ? [...prev, id] : prev.filter((x) => x !== id)
            );
          }}
          onSaveAccessGrant={() => void access.saveAccessGrant()}
          onDeleteAccessGrant={(grant) => void access.deleteAccessGrant(grant)}
          onUpdateAccessGrantRole={(grant, r) => void access.updateAccessGrantRole(grant, r)}
          onRequestSaveManagementRoles={access.requestSaveManagementRoles}
          onConfirmRoleRemoval={() => void access.doSaveManagementRoles()}
          onCancelRoleRemoval={() => access.setConfirmRoleRemoval(false)}
        />
      )}
    </section>
  );
}
