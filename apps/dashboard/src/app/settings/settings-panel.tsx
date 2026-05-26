"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select } from "../../components/ui/select";

interface DiscordRole {
  id: string;
  name: string;
}

interface SettingsResponse {
  guildId: string;
  guildName: string | null;
  isActive?: boolean;
  logMode: string;
  updatedAt: string;
  accessRole: string;
  dashboardManagementRoleIds: string[];
  availableRoles?: DiscordRole[];
}

const logModeOptions = [
  { label: "Full", value: "full" },
  { label: "Metadata Only", value: "metadata_only" },
  { label: "Disabled", value: "disabled" }
];

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [managementRoleIds, setManagementRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        setLogMode(data.logMode);
        setManagementRoleIds(data.dashboardManagementRoleIds);
      })
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  async function saveLogMode() {
    if (!settings) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const data = await updateSettings(settings.guildId, logMode);
      setSettings((s) => (s ? { ...s, ...data } : s));
      setMessage("Settings saved.");
    } catch (e) { setError(toErrorMessage(e)); } finally { setSaving(false); }
  }

  async function saveManagementRoles() {
    if (!settings) return;
    setSavingRoles(true); setError(null); setMessage(null);
    try {
      await updateManagementRoles(settings.guildId, managementRoleIds);
      setMessage("Access roles updated.");
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingRoles(false); }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading settings…</p>;
  }

  if (!settings) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? "Failed to load settings."}
      </div>
    );
  }

  const isOwner = settings.accessRole === "owner";

  return (
    <section className="grid max-w-4xl gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Guild Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyValue label="Guild ID" value={settings.guildId} />
            <ReadOnlyValue label="Guild Name" value={settings.guildName ?? "—"} />
            <ReadOnlyValue label="Access Role" value={settings.accessRole} />
            <ReadOnlyValue label="Updated" value={formatDate(settings.updatedAt)} />
          </div>

          <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Log Mode
            <Select onChange={(e) => setLogMode(e.target.value)} value={logMode}>
              {logModeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </label>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={saving} onClick={saveLogMode} type="button" size="sm">
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isOwner && settings.availableRoles !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Access</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              Roles that can access the dashboard in addition to server owner and administrators.
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
              <Button disabled={savingRoles} onClick={saveManagementRoles} size="sm" type="button">
                <Save className="h-3.5 w-3.5" />
                {savingRoles ? "Saving…" : "Save Roles"}
              </Button>
            </div>
          </CardContent>
        </Card>
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

async function updateSettings(guildId: string, logMode: string) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save settings (${r.status})`);
  return (await r.json()) as SettingsResponse;
}

async function updateManagementRoles(guildId: string, roleIds: string[]) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, dashboardManagementRoleIds: roleIds }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save roles (${r.status})`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value)
  );
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Settings request failed";
}
