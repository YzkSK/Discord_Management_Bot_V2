"use client";

import { FormEvent, useState } from "react";

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

  async function loadSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guildId.trim()) {
      setError("Enter a guild ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await fetchSettings(guildId);
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
    <main className="min-h-screen bg-[#101418] px-5 py-6 text-slate-100">
      <section className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-slate-700 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-300">
              Phase3 Settings
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Guild Settings
            </h1>
          </div>
          <a
            className="text-sm font-semibold text-teal-200 hover:text-teal-100"
            href="/logs"
          >
            Open Logs
          </a>
        </header>

        <form
          className="grid gap-3 border-b border-slate-800 pb-5 sm:grid-cols-[1fr_auto]"
          onSubmit={loadSettings}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-400">
            Guild
            <input
              className="h-11 border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none placeholder:text-slate-600 focus:border-teal-400"
              onChange={(event) => setGuildId(event.target.value)}
              placeholder="guild id"
              value={guildId}
            />
          </label>
          <button
            className="h-11 self-end border border-teal-500 bg-teal-500 px-4 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Loading" : "Load"}
          </button>
        </form>

        {error ? (
          <div className="border border-red-500 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="border border-teal-500 bg-teal-950/30 px-4 py-3 text-sm text-teal-100">
            {message}
          </div>
        ) : null}

        {settings ? (
          <section className="flex flex-col gap-4 border border-slate-800 p-4">
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

            <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-400">
              Log Mode
              <select
                className="h-11 border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-teal-400"
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
                className="h-11 border border-teal-500 bg-teal-500 px-4 text-sm font-semibold text-slate-950 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
                onClick={saveSettings}
                type="button"
              >
                {saving ? "Saving" : "Save"}
              </button>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-slate-200">{value}</p>
    </div>
  );
}

async function fetchSettings(guildId: string) {
  const query = new URLSearchParams({ guildId: guildId.trim() });
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
