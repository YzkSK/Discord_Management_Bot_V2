"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Save, Trash2 } from "lucide-react";
import type { DashboardSettingsFeatures, GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import {
  removeAccessGrant,
  toAccessGrantPayload,
  upsertAccessGrant,
  type DashboardAccessGrant,
  type GrantableAccessRole
} from "./access-grants";
import { buildSettingsSectionSummaries, type SettingsSectionKey } from "./settings-sections";

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";

interface DiscordRole {
  id: string;
  name: string;
}

interface SettingsResponse {
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
}

interface TtsDictionaryEntry {
  fromText: string;
  guildId: string;
  isEnabled: boolean;
  priority: number;
  scope: "guild" | "user";
  toText: string;
  userId: string | null;
}

interface TtsSpeakerSetting {
  guildId: string;
  speakerId: number;
  userId: string | null;
}

interface TtsSettingsResponse {
  accessRole: string;
  dictionaryEntries: TtsDictionaryEntry[];
  guildDefaultSpeaker: TtsSpeakerSetting | null;
  guildId: string;
  userSpeakers: TtsSpeakerSetting[];
}

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [tempVcCreateChannelId, setTempVcCreateChannelId] = useState("");
  const [tempVcCategoryId, setTempVcCategoryId] = useState("");
  const [ttsTextChannelId, setTtsTextChannelId] = useState("");
  const [ttsSettings, setTtsSettings] = useState<TtsSettingsResponse | null>(null);
  const [ttsDefaultSpeakerId, setTtsDefaultSpeakerId] = useState("");
  const [ttsUserSpeakerUserId, setTtsUserSpeakerUserId] = useState("");
  const [ttsUserSpeakerId, setTtsUserSpeakerId] = useState("");
  const [ttsDictionaryScope, setTtsDictionaryScope] = useState<"guild" | "user">("guild");
  const [ttsDictionaryUserId, setTtsDictionaryUserId] = useState("");
  const [ttsDictionaryFromText, setTtsDictionaryFromText] = useState("");
  const [ttsDictionaryToText, setTtsDictionaryToText] = useState("");
  const [ttsDictionaryPriority, setTtsDictionaryPriority] = useState("0");
  const [ttsDictionaryEnabled, setTtsDictionaryEnabled] = useState(true);
  const [uiLang, setUiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const [managementRoleIds, setManagementRoleIds] = useState<string[]>([]);
  const [accessGrants, setAccessGrants] = useState<DashboardAccessGrant[]>([]);
  const [grantTargetType, setGrantTargetType] = useState<"user" | "role">("user");
  const [grantTargetId, setGrantTargetId] = useState("");
  const [grantRole, setGrantRole] = useState<GrantableAccessRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTtsDictionary, setSavingTtsDictionary] = useState(false);
  const [savingTtsSpeaker, setSavingTtsSpeaker] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingGrant, setSavingGrant] = useState(false);
  const [deletingGrantKey, setDeletingGrantKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"logs" | "voice" | "tts" | "access">("logs");
  const [confirmRoleRemoval, setConfirmRoleRemoval] = useState(false);

  const loc = getDashboardLocale(uiLang);

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
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        setLogMode(data.logMode);
        setLanguage(data.language);
        setTempVcCreateChannelId(data.features.tempVc.createChannelId ?? "");
        setTempVcCategoryId(data.features.tempVc.categoryId ?? "");
        setTtsTextChannelId(data.features.tts.textChannelId ?? "");
        if (isGuildLanguage(data.language)) {
          setUiLang(data.language);
        }
        setManagementRoleIds(data.dashboardManagementRoleIds);
        return Promise.all([
          fetchTtsSettings(data.guildId).then((tts) => {
            setTtsSettings(tts);
            setTtsDefaultSpeakerId(
              tts.guildDefaultSpeaker?.speakerId.toString() ?? ""
            );
          }),
          data.accessRole === "owner"
            ? fetchAccessGrants(data.guildId).then((grants) => {
                setAccessGrants(grants);
              })
            : Promise.resolve()
        ]);
      })
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  async function saveAllChanges() {
    if (!settings) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const logsDirty = logMode !== (settings.logMode) || language !== (settings.language);
      const voiceDirty =
        tempVcCreateChannelId !== (settings.features.tempVc.createChannelId ?? "") ||
        tempVcCategoryId !== (settings.features.tempVc.categoryId ?? "");
      const ttsChannelDirty =
        ttsTextChannelId !== (settings.features.tts.textChannelId ?? "");

      const updates = await Promise.all([
        logsDirty ? updateSettings(settings.guildId, logMode, language) : null,
        voiceDirty
          ? updateTempVcSettings(settings.guildId, tempVcCreateChannelId, tempVcCategoryId)
          : null,
        ttsChannelDirty ? updateTtsSettings(settings.guildId, ttsTextChannelId) : null,
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
  }

  async function saveTtsDefaultSpeaker() {
    if (!settings) return;
    setSavingTtsSpeaker(true); setError(null); setMessage(null);
    try {
      const data = await patchTtsSpeaker({
        guildId: settings.guildId,
        speakerId: Number(ttsDefaultSpeakerId),
        target: "guild-default"
      });
      setTtsDefaultSpeakerId(data.setting.speakerId.toString());
      const tts = await fetchTtsSettings(settings.guildId);
      setTtsSettings(tts);
      setMessage(loc.ttsSpeakerSaved);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingTtsSpeaker(false); }
  }

  async function saveTtsUserSpeaker() {
    if (!settings) return;
    setSavingTtsSpeaker(true); setError(null); setMessage(null);
    try {
      await patchTtsSpeaker({
        guildId: settings.guildId,
        speakerId: Number(ttsUserSpeakerId),
        target: "user",
        userId: ttsUserSpeakerUserId
      });
      setTtsUserSpeakerId("");
      setTtsUserSpeakerUserId("");
      setTtsSettings(await fetchTtsSettings(settings.guildId));
      setMessage(loc.ttsSpeakerSaved);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingTtsSpeaker(false); }
  }

  async function deleteTtsSpeaker(input: {
    target: "guild-default" | "user";
    userId?: string;
  }) {
    if (!settings) return;
    setSavingTtsSpeaker(true); setError(null); setMessage(null);
    try {
      await deleteTtsSpeakerSetting({
        guildId: settings.guildId,
        ...input
      });
      if (input.target === "guild-default") setTtsDefaultSpeakerId("");
      setTtsSettings(await fetchTtsSettings(settings.guildId));
      setMessage(loc.ttsSpeakerDeleted);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingTtsSpeaker(false); }
  }

  async function saveTtsDictionaryEntry() {
    if (!settings) return;
    setSavingTtsDictionary(true); setError(null); setMessage(null);
    try {
      await patchTtsDictionaryEntry({
        fromText: ttsDictionaryFromText,
        guildId: settings.guildId,
        isEnabled: ttsDictionaryEnabled,
        priority: Number(ttsDictionaryPriority),
        scope: ttsDictionaryScope,
        toText: ttsDictionaryToText,
        ...(ttsDictionaryScope === "user" ? { userId: ttsDictionaryUserId } : {})
      });
      setTtsDictionaryFromText("");
      setTtsDictionaryToText("");
      setTtsDictionaryUserId("");
      setTtsDictionaryPriority("0");
      setTtsDictionaryEnabled(true);
      setTtsSettings(await fetchTtsSettings(settings.guildId));
      setMessage(loc.ttsDictionarySaved);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingTtsDictionary(false); }
  }

  async function deleteTtsDictionary(entry: TtsDictionaryEntry) {
    if (!settings) return;
    setSavingTtsDictionary(true); setError(null); setMessage(null);
    try {
      await deleteTtsDictionaryEntry({
        fromText: entry.fromText,
        guildId: settings.guildId,
        scope: entry.scope,
        ...(entry.userId ? { userId: entry.userId } : {})
      });
      setTtsSettings(await fetchTtsSettings(settings.guildId));
      setMessage(loc.ttsDictionaryDeleted);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingTtsDictionary(false); }
  }

  function requestSaveManagementRoles() {
    if (!settings) return;
    const removedAny = settings.dashboardManagementRoleIds.some(
      (id) => !managementRoleIds.includes(id)
    );
    if (removedAny) {
      setConfirmRoleRemoval(true);
    } else {
      void doSaveManagementRoles();
    }
  }

  async function doSaveManagementRoles() {
    if (!settings) return;
    setConfirmRoleRemoval(false);
    setSavingRoles(true); setError(null); setMessage(null);
    try {
      await updateManagementRoles(settings.guildId, managementRoleIds);
      setSettings((s) => s ? { ...s, dashboardManagementRoleIds: managementRoleIds } : s);
      setMessage(loc.accessRolesUpdated);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingRoles(false); }
  }

  async function saveAccessGrant() {
    if (!settings) return;
    const payload = toAccessGrantPayload({
      guildId: settings.guildId,
      targetType: grantTargetType,
      targetId: grantTargetId,
      role: grantRole
    });

    if (!payload.targetId) {
      setError(loc.accessGrantTargetRequired);
      return;
    }

    setSavingGrant(true); setError(null); setMessage(null);
    try {
      const grant = await upsertDashboardAccessGrant(payload);
      setAccessGrants((current) => upsertAccessGrant(current, grant));
      setGrantTargetId("");
      setMessage(loc.accessGrantSaved);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingGrant(false); }
  }

  async function deleteAccessGrant(grant: DashboardAccessGrant) {
    if (!settings) return;
    const key = accessGrantKey(grant);
    setDeletingGrantKey(key); setError(null); setMessage(null);
    try {
      await deleteDashboardAccessGrant({
        guildId: settings.guildId,
        targetType: grant.targetType,
        targetId: grant.targetId
      });
      setAccessGrants((current) => removeAccessGrant(current, grant));
      setMessage(loc.accessGrantDeleted);
    } catch (e) { setError(toErrorMessage(e)); } finally { setDeletingGrantKey(null); }
  }

  async function updateAccessGrantRole(
    grant: DashboardAccessGrant,
    role: GrantableAccessRole
  ) {
    if (!settings || grant.role === role) return;
    setError(null); setMessage(null);
    try {
      const updatedGrant = await upsertDashboardAccessGrant({
        guildId: settings.guildId,
        targetType: grant.targetType,
        targetId: grant.targetId,
        role
      });
      setAccessGrants((current) => upsertAccessGrant(current, updatedGrant));
      setMessage(loc.accessGrantUpdated);
    } catch (e) { setError(toErrorMessage(e)); }
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

  const isOwner = settings.accessRole === "owner";
  const canEditTts = settings.accessRole !== "viewer";
  const summaries = buildSettingsSectionSummaries(settings.features);

  const dirtyCount = useMemo(() => {
    return [
      logMode !== settings.logMode,
      language !== settings.language,
      tempVcCreateChannelId !== (settings.features.tempVc.createChannelId ?? ""),
      tempVcCategoryId !== (settings.features.tempVc.categoryId ?? ""),
      ttsTextChannelId !== (settings.features.tts.textChannelId ?? ""),
    ].filter(Boolean).length;
  }, [logMode, language, tempVcCreateChannelId, tempVcCategoryId, ttsTextChannelId, settings]);

  const isDirty = dirtyCount > 0;

  const tabDefs = [
    { key: "logs",   label: "ログ設定" },
    { key: "voice",  label: "音声" },
    { key: "tts",    label: "TTS" },
    { key: "access", label: "アクセス管理" },
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

        {/* ログ設定タブ */}
        {activeTab === "logs" && (
          <Card>
            <CardHeader>
              <CardTitle>{loc.logsSettings}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.logMode}
                <Select onChange={(e) => setLogMode(e.target.value)} value={logMode}>
                  {logModeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.language}
                <Select
                  onChange={(e) => {
                    const val = e.target.value;
                    setLanguage(val);
                    if (isGuildLanguage(val)) setUiLang(val);
                  }}
                  value={language}
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </label>

            </CardContent>
          </Card>
        )}

        {/* 音声タブ */}
        {activeTab === "voice" && (
          <Card>
            <CardHeader>
              <CardTitle>{loc.tempVcSettings}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <FeatureStatus
                configured={settings.features.tempVc.configured}
                label={loc.tempVcSettings}
                loc={loc}
              />
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.tempVcCreateChannelId}
                <Input
                  onChange={(e) => setTempVcCreateChannelId(e.target.value)}
                  value={tempVcCreateChannelId}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {loc.tempVcCategoryId}
                <Input
                  onChange={(e) => setTempVcCategoryId(e.target.value)}
                  value={tempVcCategoryId}
                />
              </label>
            </CardContent>
          </Card>
        )}

        {/* TTS タブ */}
        {activeTab === "tts" && (
        <Card>
          <CardHeader>
            <CardTitle>{loc.ttsSettings}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FeatureStatus
              configured={settings.features.tts.configured}
              label={loc.ttsSettings}
              loc={loc}
            />
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {loc.ttsTextChannelId}
              <Input
                onChange={(e) => setTtsTextChannelId(e.target.value)}
                value={ttsTextChannelId}
              />
            </label>
            <div className="grid gap-3 border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold text-zinc-300">{loc.ttsSpeakerDefault}</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  disabled={!canEditTts}
                  onChange={(e) => setTtsDefaultSpeakerId(e.target.value)}
                  value={ttsDefaultSpeakerId}
                />
                <Button
                  disabled={!canEditTts || savingTtsSpeaker}
                  onClick={saveTtsDefaultSpeaker}
                  size="sm"
                  type="button"
                >
                  <Save className="h-3.5 w-3.5" />
                  {loc.saveChanges}
                </Button>
                <Button
                  disabled={!canEditTts || savingTtsSpeaker || !ttsSettings?.guildDefaultSpeaker}
                  onClick={() => void deleteTtsSpeaker({ target: "guild-default" })}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold text-zinc-300">{loc.ttsUserSpeakers}</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                <Input
                  disabled={!canEditTts}
                  onChange={(e) => setTtsUserSpeakerUserId(e.target.value)}
                  placeholder={loc.accessGrantUserId}
                  value={ttsUserSpeakerUserId}
                />
                <Input
                  disabled={!canEditTts}
                  onChange={(e) => setTtsUserSpeakerId(e.target.value)}
                  placeholder={loc.ttsSpeakerId}
                  value={ttsUserSpeakerId}
                />
                <Button
                  disabled={!canEditTts || savingTtsSpeaker}
                  onClick={saveTtsUserSpeaker}
                  size="sm"
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {loc.saveChanges}
                </Button>
              </div>
              <div className="overflow-hidden rounded-md border border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{loc.accessGrantUserId}</TableHead>
                      <TableHead className="w-28">{loc.ttsSpeakerId}</TableHead>
                      <TableHead className="w-16">{loc.accessGrantAction}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!ttsSettings?.userSpeakers.length ? (
                      <TableRow>
                        <TableCell className="py-5 text-center text-zinc-600" colSpan={3}>
                          {loc.notConfigured}
                        </TableCell>
                      </TableRow>
                    ) : ttsSettings.userSpeakers.map((speaker) => (
                      <TableRow key={speaker.userId}>
                        <TableCell className="break-all font-mono text-xs">{speaker.userId}</TableCell>
                        <TableCell>{speaker.speakerId}</TableCell>
                        <TableCell>
                          <Button
                            disabled={!canEditTts || savingTtsSpeaker}
                            onClick={() => {
                              if (speaker.userId) {
                                void deleteTtsSpeaker({
                                  target: "user",
                                  userId: speaker.userId
                                });
                              }
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid gap-3 border-t border-zinc-800 pt-3">
              <p className="text-xs font-semibold text-zinc-300">{loc.ttsDictionary}</p>
              <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr]">
                <Select
                  disabled={!canEditTts}
                  onChange={(e) => setTtsDictionaryScope(e.target.value === "user" ? "user" : "guild")}
                  value={ttsDictionaryScope}
                >
                  <option value="guild">guild</option>
                  <option value="user">user</option>
                </Select>
                <Input
                  disabled={!canEditTts || ttsDictionaryScope === "guild"}
                  onChange={(e) => setTtsDictionaryUserId(e.target.value)}
                  placeholder={loc.accessGrantUserId}
                  value={ttsDictionaryUserId}
                />
                <Input
                  disabled={!canEditTts}
                  onChange={(e) => setTtsDictionaryPriority(e.target.value)}
                  placeholder={loc.ttsPriority}
                  value={ttsDictionaryPriority}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  disabled={!canEditTts}
                  onChange={(e) => setTtsDictionaryFromText(e.target.value)}
                  placeholder={loc.ttsFromText}
                  value={ttsDictionaryFromText}
                />
                <Input
                  disabled={!canEditTts}
                  onChange={(e) => setTtsDictionaryToText(e.target.value)}
                  placeholder={loc.ttsToText}
                  value={ttsDictionaryToText}
                />
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    checked={ttsDictionaryEnabled}
                    disabled={!canEditTts}
                    onChange={(e) => setTtsDictionaryEnabled(e.target.checked)}
                    type="checkbox"
                  />
                  {loc.ttsEnabled}
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!canEditTts || savingTtsDictionary}
                  onClick={saveTtsDictionaryEntry}
                  size="sm"
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {loc.saveChanges}
                </Button>
              </div>
              <div className="overflow-hidden rounded-md border border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">{loc.ttsScope}</TableHead>
                      <TableHead>{loc.ttsFromText}</TableHead>
                      <TableHead>{loc.ttsToText}</TableHead>
                      <TableHead className="w-20">{loc.ttsPriority}</TableHead>
                      <TableHead className="w-16">{loc.accessGrantAction}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!ttsSettings?.dictionaryEntries.length ? (
                      <TableRow>
                        <TableCell className="py-5 text-center text-zinc-600" colSpan={5}>
                          {loc.notConfigured}
                        </TableCell>
                      </TableRow>
                    ) : ttsSettings.dictionaryEntries.map((entry) => (
                      <TableRow key={ttsDictionaryKey(entry)}>
                        <TableCell>{entry.scope}</TableCell>
                        <TableCell className="break-all">{entry.fromText}</TableCell>
                        <TableCell className="break-all">{entry.toText}</TableCell>
                        <TableCell>{entry.priority}</TableCell>
                        <TableCell>
                          <Button
                            disabled={!canEditTts || savingTtsDictionary}
                            onClick={() => void deleteTtsDictionary(entry)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        )}

        {/* アクセス管理タブ */}
        {activeTab === "access" && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>{loc.dashboardAccess}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="text-xs text-zinc-500">
              {loc.dashboardAccessNote}
            </p>

            <div className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3">
              <div className="grid gap-2 sm:grid-cols-[110px_1fr_120px]">
                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {loc.accessGrantTarget}
                  <Select
                    onChange={(e) => {
                      const targetType = e.target.value === "role" ? "role" : "user";
                      setGrantTargetType(targetType);
                      setGrantTargetId("");
                    }}
                    value={grantTargetType}
                  >
                    <option value="user">{loc.accessGrantUser}</option>
                    <option value="role">{loc.accessGrantRole}</option>
                  </Select>
                </label>

                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {grantTargetType === "role" ? loc.accessGrantRole : loc.accessGrantUserId}
                  {grantTargetType === "role" && settings.availableRoles?.length ? (
                    <Select
                      onChange={(e) => setGrantTargetId(e.target.value)}
                      value={grantTargetId}
                    >
                      <option value="">{loc.accessGrantSelectRole}</option>
                      {settings.availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      onChange={(e) => setGrantTargetId(e.target.value)}
                      placeholder={grantTargetType === "role" ? loc.accessGrantRoleId : loc.accessGrantUserId}
                      value={grantTargetId}
                    />
                  )}
                </label>

                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {loc.accessGrantRole}
                  <Select
                    onChange={(e) => setGrantRole(e.target.value === "admin" ? "admin" : "viewer")}
                    value={grantRole}
                  >
                    <option value="viewer">{loc.accessGrantViewer}</option>
                    <option value="admin">{loc.accessGrantAdmin}</option>
                  </Select>
                </label>
              </div>

              <div className="flex justify-end">
                <Button disabled={savingGrant} onClick={saveAccessGrant} size="sm" type="button">
                  <Plus className="h-3.5 w-3.5" />
                  {savingGrant ? loc.saving : loc.accessGrantSave}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">{loc.accessGrantTarget}</TableHead>
                    <TableHead>{loc.accessGrantId}</TableHead>
                    <TableHead className="w-28">{loc.accessGrantAccess}</TableHead>
                    <TableHead className="w-20">{loc.accessGrantAction}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessGrants.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-zinc-600" colSpan={4}>
                        {loc.noAccessGrants}
                      </TableCell>
                    </TableRow>
                  ) : accessGrants.map((grant) => (
                    <TableRow key={accessGrantKey(grant)}>
                      <TableCell className="capitalize text-zinc-400">{grant.targetType}</TableCell>
                      <TableCell>
                        <span className="break-all font-mono text-xs text-zinc-300">
                          {formatGrantTarget(grant, settings.availableRoles)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          onChange={(e) => {
                            const role = e.target.value === "admin" ? "admin" : "viewer";
                            void updateAccessGrantRole(grant, role);
                          }}
                          value={grant.role}
                        >
                          <option value="viewer">{loc.accessGrantViewer}</option>
                          <option value="admin">{loc.accessGrantAdmin}</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          disabled={deletingGrantKey === accessGrantKey(grant)}
                          onClick={() => void deleteAccessGrant(grant)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {settings.availableRoles !== undefined && (
              <div className="grid gap-3 border-t border-zinc-800 pt-4">
                <p className="text-xs text-zinc-500">
                  {loc.managementRoleShortcutNote}
                </p>
                <div className="flex flex-col gap-1.5">
                  {settings.availableRoles.map((role) => (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-800 px-3 py-2 hover:border-zinc-700"
                      key={role.id}
                    >
                      <input
                        checked={managementRoleIds.includes(role.id)}
                        className="h-4 w-4 accent-green-500"
                        onChange={(e) => {
                          setManagementRoleIds(
                            e.target.checked
                              ? [...managementRoleIds, role.id]
                              : managementRoleIds.filter((id) => id !== role.id)
                          );
                        }}
                        type="checkbox"
                      />
                      <span className="text-sm text-zinc-300">{role.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button disabled={savingRoles} onClick={requestSaveManagementRoles} size="sm" type="button">
                    <Save className="h-3.5 w-3.5" />
                    {savingRoles ? loc.savingRoles : loc.saveRoles}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
      {confirmRoleRemoval && (
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
                onClick={() => setConfirmRoleRemoval(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                キャンセル
              </Button>
              <Button
                onClick={() => void doSaveManagementRoles()}
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
      values: {
        createChannelId,
        categoryId
      }
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
      values: {
        textChannelId
      }
    }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save TTS settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function fetchTtsSettings(guildId: string): Promise<TtsSettingsResponse> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/tts-settings?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load TTS settings (${r.status})`);
  return (await r.json()) as TtsSettingsResponse;
}

async function patchTtsSpeaker(input:
  | {
      guildId: string;
      speakerId: number;
      target: "guild-default";
    }
  | {
      guildId: string;
      speakerId: number;
      target: "user";
      userId: string;
    }
) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "speaker" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save TTS speaker (${r.status})`);
  return (await r.json()) as { setting: TtsSpeakerSetting };
}

async function deleteTtsSpeakerSetting(input:
  | {
      guildId: string;
      target: "guild-default";
    }
  | {
      guildId: string;
      target: "user";
      userId?: string;
    }
) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "speaker" }),
    headers: { "content-type": "application/json" },
    method: "DELETE"
  });
  if (!r.ok) throw new Error(`Failed to delete TTS speaker (${r.status})`);
}

async function patchTtsDictionaryEntry(input: {
  fromText: string;
  guildId: string;
  isEnabled: boolean;
  priority: number;
  scope: "guild" | "user";
  toText: string;
  userId?: string;
}) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "dictionary" }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save TTS dictionary (${r.status})`);
}

async function deleteTtsDictionaryEntry(input: {
  fromText: string;
  guildId: string;
  scope: "guild" | "user";
  userId?: string;
}) {
  const r = await fetch("/api/tts-settings", {
    body: JSON.stringify({ ...input, kind: "dictionary" }),
    headers: { "content-type": "application/json" },
    method: "DELETE"
  });
  if (!r.ok) throw new Error(`Failed to delete TTS dictionary (${r.status})`);
}

async function updateManagementRoles(guildId: string, roleIds: string[]) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, dashboardManagementRoleIds: roleIds }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save roles (${r.status})`);
}

interface AccessGrantsResponse {
  grants: DashboardAccessGrant[];
}

async function fetchAccessGrants(guildId: string): Promise<DashboardAccessGrant[]> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/dashboard-access?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load dashboard access grants (${r.status})`);
  const data = (await r.json()) as AccessGrantsResponse;
  return data.grants;
}

async function upsertDashboardAccessGrant(input: {
  guildId: string;
  targetType: "user" | "role";
  targetId: string;
  role: GrantableAccessRole;
}) {
  const r = await fetch("/api/dashboard-access", {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save dashboard access grant (${r.status})`);
  const data = (await r.json()) as { grant: DashboardAccessGrant };
  return data.grant;
}

async function deleteDashboardAccessGrant(input: {
  guildId: string;
  targetType: "user" | "role";
  targetId: string;
}) {
  const r = await fetch("/api/dashboard-access", {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "DELETE"
  });
  if (!r.ok) throw new Error(`Failed to delete dashboard access grant (${r.status})`);
}

function accessGrantKey(grant: {
  guildId: string;
  targetType: string;
  targetId: string;
}) {
  return `${grant.guildId}:${grant.targetType}:${grant.targetId}`;
}

function ttsDictionaryKey(entry: TtsDictionaryEntry) {
  return `${entry.guildId}:${entry.scope}:${entry.userId ?? ""}:${entry.fromText}`;
}

function FeatureStatus({
  configured,
  label,
  loc
}: {
  configured: boolean;
  label: string;
  loc: ReturnType<typeof getDashboardLocale>;
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

function sectionLabel(
  key: SettingsSectionKey,
  loc: ReturnType<typeof getDashboardLocale>
) {
  if (key === "logs") return loc.logsSettings;
  if (key === "tempVc") return loc.tempVcSettings;
  if (key === "tts") return loc.ttsSettings;
  return loc.recruitmentSettings;
}

function formatGrantTarget(grant: DashboardAccessGrant, roles: DiscordRole[] | undefined) {
  if (grant.targetType === "role") {
    const role = roles?.find((item) => item.id === grant.targetId);
    return role ? `${role.name} (${grant.targetId})` : grant.targetId;
  }

  return grant.targetId;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value)
  );
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Settings request failed";
}
