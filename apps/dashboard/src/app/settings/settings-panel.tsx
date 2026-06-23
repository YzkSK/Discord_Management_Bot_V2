"use client";

import { useCallback, useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { fetchSettings, toSettingsError } from "../../lib/settings-api";
import { canSeeItem } from "../../lib/roles";
import { AccessGrantsTab } from "./components/AccessGrantsTab";
import { LanguageTab } from "./components/LanguageTab";
import { TtsPersonalTab } from "./components/TtsPersonalTab";
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
  section: "personal" | "server";
  minRole?: "admin" | "owner";
}

const ALL_TABS: Tab[] = [
  { key: "language",     label: "表示言語",     section: "personal" },
  { key: "tts-personal", label: "TTS",          section: "personal" },
  { key: "voice",        label: "Voice",        section: "server", minRole: "admin" },
  { key: "tts",          label: "TTS",          section: "server", minRole: "admin" },
  { key: "recruitment",  label: "Recruitment",  section: "server", minRole: "admin" },
  { key: "logs",         label: "Logs",         section: "server", minRole: "admin" },
  { key: "access",       label: "Access",       section: "server", minRole: "owner" },
];

export function SettingsPanel({
  guildId,
  role,
}: {
  guildId: string;
  role: "viewer" | "admin" | "owner" | null;
}) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("language");

  const loc = getDashboardLocale(uiLang);
  const isOwner = settings?.accessRole === "owner";
  const access = useAccessGrants(settings?.guildId ?? null, isOwner, loc);

  const visibleTabs = ALL_TABS.filter((tab) => canSeeItem(tab.minRole, role));
  const personalTabs = visibleTabs.filter((t) => t.section === "personal");
  const serverTabs = visibleTabs.filter((t) => t.section === "server");

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
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
    <section className="flex gap-6">
      {/* Sidebar nav */}
      <nav className="w-44 shrink-0">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">
          個人設定
        </p>
        {personalTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
            className={`w-full text-left px-3 py-1.5 mb-0.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#404249] text-[#dbdee1]"
                : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {serverTabs.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">
              サーバー設定
            </p>
            {serverTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
                className={`w-full text-left px-3 py-1.5 mb-0.5 rounded text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-[#404249] text-[#dbdee1]"
                    : "text-[#b5bac1] hover:bg-[#35373c] hover:text-[#dbdee1]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Tab content */}
      <div className="flex-1 min-w-0 grid gap-4">
        {activeTab === "language" && (
          <LanguageTab uiLang={uiLang} onUiLangChange={setUiLang} />
        )}
        {activeTab === "tts-personal" && <TtsPersonalTab guildId={guildId} />}
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
      </div>
    </section>
  );
}
