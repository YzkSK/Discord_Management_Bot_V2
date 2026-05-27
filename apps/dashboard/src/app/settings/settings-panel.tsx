"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save, Search } from "lucide-react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { dashboardGuildStorageKey, normalizeGuildId } from "../dashboard-ui";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";

interface SettingsResponse {
  guildId: string;
  guildName: string | null;
  isActive?: boolean;
  logMode: string;
  language: string;
  updatedAt: string;
  accessRole: string;
}

export function SettingsPanel() {
  const [guildId, setGuildId] = useState("");
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [uiLang, setUiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const storedGuildId = window.localStorage.getItem(dashboardGuildStorageKey);
    if (storedGuildId) {
      setGuildId(storedGuildId);
    }
  }, []);

  async function loadSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedGuildId = normalizeGuildId(guildId);

    if (!normalizedGuildId) {
      setError(loc.enterGuildId);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    window.localStorage.setItem(dashboardGuildStorageKey, normalizedGuildId);

    try {
      const data = await fetchSettings(normalizedGuildId);
      setGuildId(normalizedGuildId);
      setSettings(data);
      setLogMode(data.logMode);
      setLanguage(data.language);
      if (isGuildLanguage(data.language)) {
        setUiLang(data.language);
      }
    } catch (caughtError) {
      setSettings(null);
      setError(toErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const data = await updateSettings(settings.guildId, logMode, language);
      setSettings({ ...settings, ...data });
      setMessage(loc.settingsSaved);
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid max-w-6xl gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{loc.loadGuild}</CardTitle>
          <CardDescription>{loc.guildIdSharedNote}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={loadSettings}>
            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
              {loc.guildId}
              <Input
                className="normal-case"
                onChange={(event) => setGuildId(event.target.value)}
                placeholder="required guild id"
                value={guildId}
              />
            </label>

            <Button className="mt-4 w-full" disabled={loading} type="submit">
              <Search className="h-4 w-4" />
              {loading ? loc.loading : loc.loadSettings}
            </Button>
          </form>

          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              {message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{loc.guildSettings}</CardTitle>
          <CardDescription>{loc.reviewAccessNote}</CardDescription>
        </CardHeader>

        {settings ? (
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <ReadOnlyValue label={loc.guildId} value={settings.guildId} />
              <ReadOnlyValue
                label={loc.guildName}
                value={settings.guildName ?? "-"}
              />
              <ReadOnlyValue label={loc.access} value={settings.accessRole} />
              <ReadOnlyValue
                label={loc.updated}
                value={formatDate(settings.updatedAt)}
              />
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
              {loc.logMode}
              <Select
                onChange={(event) => setLogMode(event.target.value)}
                value={logMode}
              >
                {logModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
              {loc.language}
              <Select
                onChange={(event) => {
                  const val = event.target.value;
                  setLanguage(val);
                  if (isGuildLanguage(val)) {
                    setUiLang(val);
                  }
                }}
                value={language}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <div className="flex justify-end">
              <Button disabled={saving} onClick={saveSettings} type="button">
                <Save className="h-4 w-4" />
                {saving ? loc.saving : loc.saveChanges}
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              {loc.loadGuildFirst}
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-slate-800">{value}</p>
    </div>
  );
}

async function fetchSettings(guildId: string) {
  const query = new URLSearchParams({ guildId });
  const response = await fetch(`/api/settings?${query.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load settings (${response.status})`);
  }

  return (await response.json()) as SettingsResponse;
}

async function updateSettings(guildId: string, logMode: string, language: string) {
  const response = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode, language }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });

  if (!response.ok) {
    throw new Error(`Failed to save settings (${response.status})`);
  }

  return (await response.json()) as SettingsResponse;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Settings request failed";
}
