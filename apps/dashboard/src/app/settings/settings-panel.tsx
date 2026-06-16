"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { buildSettingsSectionSummaries, type SettingsSectionKey } from "./settings-sections";
import { AccessGrantsTab } from "./components/AccessGrantsTab";
import { LogsSettingsTab } from "./components/LogsSettingsTab";
import { RecruitmentSettingsTab } from "./components/RecruitmentSettingsTab";
import { TtsSettingsTab } from "./components/TtsSettingsTab";
import { VoiceSettingsTab } from "./components/VoiceSettingsTab";
import {
  FeatureStatus,
  type SettingsResponse,
  type TtsSettingsResponse
} from "./components/shared";
import { useTtsSettings } from "./hooks/useTtsSettings";
import { useAccessGrants } from "./hooks/useAccessGrants";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export type { SettingsResponse, TtsSettingsResponse };

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [tempVcCreateChannelId, setTempVcCreateChannelId] = useState("");
  const [tempVcCategoryId, setTempVcCategoryId] = useState("");
  const [ttsTextChannelId, setTtsTextChannelId] = useState("");
  const [recruitmentChannelId, setRecruitmentChannelId] = useState("");
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"logs" | "voice" | "tts" | "recruitment" | "access">("logs");

  const loc = getDashboardLocale(uiLang);

  const isOwner = settings?.accessRole === "owner";

  const tts = useTtsSettings(settings?.guildId ?? null, loc, setError, setMessage);
  const access = useAccessGrants(settings?.guildId ?? null, isOwner, loc, setError, setMessage);

  const logModeOptions = [
    { label: loc.logModeFull, value: "full" },
    { label: loc.logModeMetadataOnly, value: "metadata_only" },
    { label: loc.logModeDisabled, value: "disabled" }
  ];

  const languageOptions = [
    { label: loc.languageEn, value: "en" },
    { label: loc.languageJa, value: "ja" }
  ];

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
  }, []);

  useEffect(() => {
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        setLogMode(data.logMode);
        setLanguage(data.language);
        setTempVcCreateChannelId(data.features.tempVc.createChannelId ?? "");
        setTempVcCategoryId(data.features.tempVc.categoryId ?? "");
        setTtsTextChannelId(data.features.tts.textChannelId ?? "");
        setRecruitmentChannelId(data.features.recruitment.channelId ?? "");
        if (isGuildLanguage(data.language)) {
          setUiLang(data.language);
        }
        access.initManagementRoles(data.dashboardManagementRoleIds);
      })
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirtyCount = useMemo(() => {
    if (!settings) return 0;
    return [
      logMode !== settings.logMode,
      language !== settings.language,
      tempVcCreateChannelId !== (settings.features.tempVc.createChannelId ?? ""),
      tempVcCategoryId !== (settings.features.tempVc.categoryId ?? ""),
      ttsTextChannelId !== (settings.features.tts.textChannelId ?? ""),
      recruitmentChannelId !== (settings.features.recruitment.channelId ?? ""),
    ].filter(Boolean).length;
  }, [logMode, language, tempVcCreateChannelId, tempVcCategoryId, ttsTextChannelId, recruitmentChannelId, settings]);

  async function saveAllChanges() {
    if (!settings) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const logsDirty = logMode !== settings.logMode || language !== settings.language;
      const voiceDirty =
        tempVcCreateChannelId !== (settings.features.tempVc.createChannelId ?? "") ||
        tempVcCategoryId !== (settings.features.tempVc.categoryId ?? "");
      const ttsChannelDirty = ttsTextChannelId !== (settings.features.tts.textChannelId ?? "");
      const recruitmentDirty =
        recruitmentChannelId !== (settings.features.recruitment.channelId ?? "");

      const updates = await Promise.all([
        logsDirty ? updateSettings(settings.guildId, logMode, language) : null,
        voiceDirty
          ? updateTempVcSettings(settings.guildId, tempVcCreateChannelId, tempVcCategoryId)
          : null,
        ttsChannelDirty ? updateTtsSettings(settings.guildId, ttsTextChannelId) : null,
        recruitmentDirty
          ? updateRecruitmentSettings(settings.guildId, { channelId: recruitmentChannelId || null })
          : null,
      ]);

      setSettings((s) => {
        if (!s) return s;
        let merged = { ...s };
        for (const update of updates) {
          if (update) merged = { ...merged, ...update };
        }
        return merged;
      });
      setMessage(loc.settingsSaved);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSaving(false); }
  }

  function cancelChanges() {
    if (!settings) return;
    setLogMode(settings.logMode);
    setLanguage(settings.language);
    setTempVcCreateChannelId(settings.features.tempVc.createChannelId ?? "");
    setTempVcCategoryId(settings.features.tempVc.categoryId ?? "");
    setTtsTextChannelId(settings.features.tts.textChannelId ?? "");
    setRecruitmentChannelId(settings.features.recruitment.channelId ?? "");
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">{loc.loading}…</p>;
  }

  if (!settings) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? loc.failedToLoadSettings}
      </div>
    );
  }

  const canEditTts = settings.accessRole !== "viewer";
  const summaries = buildSettingsSectionSummaries(settings.features);
  const isDirty = dirtyCount > 0;

  const tabDefs = [
    { key: "logs",        label: "ログ設定" },
    { key: "voice",       label: "音声" },
    { key: "tts",         label: "TTS" },
    { key: "recruitment", label: "募集" },
    { key: "access",      label: "アクセス管理" },
  ] as const;

  return (
    <section className="grid max-w-5xl gap-4">
      {/* 概要 */}
      <Card>
        <CardHeader>
          <CardTitle>{loc.settingsOverview}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyValue label={loc.guildId} value={settings.guildId} />
            <ReadOnlyValue label={loc.guildName} value={settings.guildName ?? "—"} />
            <ReadOnlyValue label={loc.access} value={settings.accessRole} />
            <ReadOnlyValue label={loc.updated} value={formatDate(settings.updatedAt)} />
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {summaries.map((summary) => (
              <FeatureStatus
                configured={summary.configured}
                key={summary.key}
                label={sectionLabel(summary.key, loc)}
                loc={loc}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* タブ + セクション */}
      <div>
        {/* タブバー */}
        <div className="flex gap-0.5 border-b border-zinc-800 mb-4">
          {tabDefs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? "border-b-2 border-green-500 px-4 py-2.5 text-sm font-medium text-green-400 -mb-px"
                  : "px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            {message}
          </div>
        )}

        {activeTab === "logs" && (
          <LogsSettingsTab
            logMode={logMode}
            language={language}
            logModeOptions={logModeOptions}
            languageOptions={languageOptions}
            loc={loc}
            onLogModeChange={setLogMode}
            onLanguageChange={setLanguage}
            onUiLangChange={(val) => { if (isGuildLanguage(val)) setUiLang(val); }}
          />
        )}

        {activeTab === "voice" && (
          <VoiceSettingsTab
            tempVcCreateChannelId={tempVcCreateChannelId}
            tempVcCategoryId={tempVcCategoryId}
            settings={settings}
            loc={loc}
            onTempVcCreateChannelIdChange={setTempVcCreateChannelId}
            onTempVcCategoryIdChange={setTempVcCategoryId}
          />
        )}

        {activeTab === "tts" && (
          <TtsSettingsTab
            settings={settings}
            ttsSettings={tts.ttsSettings}
            ttsTextChannelId={ttsTextChannelId}
            ttsDefaultSpeakerId={tts.ttsDefaultSpeakerId}
            ttsUserSpeakerUserId={tts.ttsUserSpeakerUserId}
            ttsUserSpeakerId={tts.ttsUserSpeakerId}
            ttsDictionaryScope={tts.ttsDictionaryScope}
            ttsDictionaryUserId={tts.ttsDictionaryUserId}
            ttsDictionaryFromText={tts.ttsDictionaryFromText}
            ttsDictionaryToText={tts.ttsDictionaryToText}
            ttsDictionaryPriority={tts.ttsDictionaryPriority}
            ttsDictionaryEnabled={tts.ttsDictionaryEnabled}
            canEditTts={canEditTts}
            savingTtsDictionary={tts.savingTtsDictionary}
            savingTtsSpeaker={tts.savingTtsSpeaker}
            loc={loc}
            onTtsTextChannelIdChange={setTtsTextChannelId}
            onTtsDefaultSpeakerIdChange={tts.setTtsDefaultSpeakerId}
            onTtsUserSpeakerUserIdChange={tts.setTtsUserSpeakerUserId}
            onTtsUserSpeakerIdChange={tts.setTtsUserSpeakerId}
            onTtsDictionaryScopeChange={tts.setTtsDictionaryScope}
            onTtsDictionaryUserIdChange={tts.setTtsDictionaryUserId}
            onTtsDictionaryFromTextChange={tts.setTtsDictionaryFromText}
            onTtsDictionaryToTextChange={tts.setTtsDictionaryToText}
            onTtsDictionaryPriorityChange={tts.setTtsDictionaryPriority}
            onTtsDictionaryEnabledChange={tts.setTtsDictionaryEnabled}
            onSaveTtsDefaultSpeaker={() => void tts.saveTtsDefaultSpeaker()}
            onSaveTtsUserSpeaker={() => void tts.saveTtsUserSpeaker()}
            onDeleteTtsSpeaker={(input) => void tts.deleteTtsSpeaker(input)}
            onSaveTtsDictionaryEntry={() => void tts.saveTtsDictionaryEntry()}
            onDeleteTtsDictionary={(entry) => void tts.deleteTtsDictionary(entry)}
          />
        )}

        {activeTab === "recruitment" && (
          <RecruitmentSettingsTab
            recruitmentChannelId={recruitmentChannelId}
            settings={settings}
            loc={loc}
            onRecruitmentChannelIdChange={setRecruitmentChannelId}
          />
        )}

        {activeTab === "access" && isOwner && (
          <AccessGrantsTab
            settings={settings}
            accessGrants={access.accessGrants}
            grantTargetType={access.grantTargetType}
            grantTargetId={access.grantTargetId}
            grantRole={access.grantRole}
            managementRoleIds={access.managementRoleIds}
            savingGrant={access.savingGrant}
            savingRoles={access.savingRoles}
            deletingGrantKey={access.deletingGrantKey}
            loc={loc}
            onGrantTargetTypeChange={access.setGrantTargetType}
            onGrantTargetIdChange={access.setGrantTargetId}
            onGrantRoleChange={access.setGrantRole}
            onManagementRoleChange={(id, checked) => {
              access.setManagementRoleIds((prev) =>
                checked ? [...prev, id] : prev.filter((x) => x !== id)
              );
            }}
            onSaveAccessGrant={() => void access.saveAccessGrant()}
            onDeleteAccessGrant={(grant) => void access.deleteAccessGrant(grant)}
            onUpdateAccessGrantRole={(grant, role) => void access.updateAccessGrantRole(grant, role)}
            onRequestSaveManagementRoles={access.requestSaveManagementRoles}
          />
        )}
      </div>

      {/* 未保存変更バー */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-700 bg-zinc-900/95 px-4 py-3 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span className="text-sm text-zinc-300">
              {dirtyCount}件の変更があります
            </span>
            <div className="flex gap-2">
              <Button
                disabled={saving}
                onClick={cancelChanges}
                size="sm"
                type="button"
                variant="ghost"
              >
                キャンセル
              </Button>
              <Button
                disabled={saving}
                onClick={() => void saveAllChanges()}
                size="sm"
                type="button"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? loc.saving : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 管理ロール削除確認モーダル */}
      {access.confirmRoleRemoval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
              <div>
                <p className="text-sm font-semibold text-zinc-100">管理ロールを削除しますか？</p>
                <p className="mt-1 text-xs text-zinc-400">
                  該当ロールを持つユーザーのダッシュボードアクセスが失われます。
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                onClick={() => access.setConfirmRoleRemoval(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                キャンセル
              </Button>
              <Button
                onClick={() => void access.doSaveManagementRoles()}
                size="sm"
                type="button"
                variant="destructive"
              >
                削除して保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 break-all font-mono text-xs text-zinc-300">{value}</p>
    </div>
  );
}

async function fetchSettings(guildId: string): Promise<SettingsResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/settings?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateSettings(guildId: string, logMode: string, language: string) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode, language }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateTempVcSettings(
  guildId: string,
  createChannelId: string,
  categoryId: string
) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({
      guildId,
      section: "tempVc",
      values: { createChannelId, categoryId }
    }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save Temp VC settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateTtsSettings(guildId: string, textChannelId: string) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({
      guildId,
      section: "tts",
      values: { textChannelId }
    }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save TTS settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateRecruitmentSettings(
  guildId: string,
  values: { channelId: string | null }
): Promise<SettingsResponse> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guildId, section: "recruitment", values })
  });
  if (!res.ok) throw new Error("Failed to save recruitment settings");
  return (await res.json()) as SettingsResponse;
}

function sectionLabel(
  key: SettingsSectionKey,
  loc: ReturnType<typeof getDashboardLocale>
) {
  if (key === "logs") return loc.logsSettings;
  if (key === "tempVc") return loc.tempVcSettings;
  if (key === "tts") return loc.ttsSettings;
  return loc.recruitmentSettings;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value)
  );
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Settings request failed";
}
