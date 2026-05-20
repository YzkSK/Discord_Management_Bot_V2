"use client";

import { FormEvent, useEffect, useState } from "react";

import { dashboardGuildStorageKey, normalizeGuildId } from "../dashboard-ui";

interface SettingsResponse {
  guildId: string;
  guildName: string | null;
  isActive?: boolean;
  logMode: string;
  updatedAt: string;
  accessRole: string;
}

const logModeOptions = [
  { label: "Full", value: "full" },
  { label: "Metadata Only", value: "metadata_only" },
  { label: "Disabled", value: "disabled" }
];

export function SettingsPanel() {
  const [guildId, setGuildId] = useState("");
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError("Enter a guild ID.");
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
      const data = await updateSettings(settings.guildId, logMode);
      setSettings({ ...settings, ...data });
      setMessage("Settings saved.");
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid max-w-6xl gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <form
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={loadSettings}
      >
        <h2 className="text-lg font-semibold text-slate-950">Load Guild</h2>
        <p className="mt-1 text-sm text-slate-600">
          This guild ID is shared with Logs in this browser.
        </p>

        <label className="mt-4 flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
          Guild ID
          <input
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => setGuildId(event.target.value)}
            placeholder="required guild id"
            value={guildId}
          />
        </label>

        <button
          className="mt-4 h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          {loading ? "Loading" : "Load Settings"}
        </button>

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
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Guild Settings</h2>

        {settings ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <ReadOnlyValue label="Guild ID" value={settings.guildId} />
              <ReadOnlyValue
                label="Guild Name"
                value={settings.guildName ?? "-"}
              />
              <ReadOnlyValue label="Access" value={settings.accessRole} />
              <ReadOnlyValue
                label="Updated"
                value={formatDate(settings.updatedAt)}
              />
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
              Log Mode
              <select
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => setLogMode(event.target.value)}
                value={logMode}
              >
                {logModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end">
              <button
                className="h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
                onClick={saveSettings}
                type="button"
              >
                {saving ? "Saving" : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Load a guild to review its access role and logging mode.
          </div>
        )}
      </section>
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

async function updateSettings(guildId: string, logMode: string) {
  const response = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode }),
    headers: {
      "content-type": "application/json"
    },
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
