"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { GuildLanguage } from "@discord-bot/shared";
import { isGuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import {
  removeAccessGrant,
  toAccessGrantPayload,
  upsertAccessGrant,
  type DashboardAccessGrant,
  type GrantableAccessRole
} from "./access-grants";

import { Button } from "../../components/ui/button";
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
  availableRoles?: DiscordRole[];
}

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [logMode, setLogMode] = useState("full");
  const [language, setLanguage] = useState("en");
  const [uiLang, setUiLang] = useState<GuildLanguage>(detectBrowserLanguage);
  const [managementRoleIds, setManagementRoleIds] = useState<string[]>([]);
  const [accessGrants, setAccessGrants] = useState<DashboardAccessGrant[]>([]);
  const [grantTargetType, setGrantTargetType] = useState<"user" | "role">("user");
  const [grantTargetId, setGrantTargetId] = useState("");
  const [grantRole, setGrantRole] = useState<GrantableAccessRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingGrant, setSavingGrant] = useState(false);
  const [deletingGrantKey, setDeletingGrantKey] = useState<string | null>(null);
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
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        setLogMode(data.logMode);
        setLanguage(data.language);
        if (isGuildLanguage(data.language)) {
          setUiLang(data.language);
        }
        setManagementRoleIds(data.dashboardManagementRoleIds);
        if (data.accessRole === "owner") {
          return fetchAccessGrants(data.guildId).then((grants) => {
            setAccessGrants(grants);
          });
        }
        return undefined;
      })
      .catch((e: unknown) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [guildId]);

  async function saveLogMode() {
    if (!settings) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const data = await updateSettings(settings.guildId, logMode, language);
      setSettings((s) => (s ? { ...s, ...data } : s));
      setMessage(loc.settingsSaved);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSaving(false); }
  }

  async function saveManagementRoles() {
    if (!settings) return;
    setSavingRoles(true); setError(null); setMessage(null);
    try {
      await updateManagementRoles(settings.guildId, managementRoleIds);
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
      setError("Target ID is required.");
      return;
    }

    setSavingGrant(true); setError(null); setMessage(null);
    try {
      const grant = await upsertDashboardAccessGrant(payload);
      setAccessGrants((current) => upsertAccessGrant(current, grant));
      setGrantTargetId("");
      setMessage("Dashboard access grant saved.");
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
      setMessage("Dashboard access grant deleted.");
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
      setMessage("Dashboard access grant updated.");
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

  return (
    <section className="grid max-w-4xl gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{loc.guildInfo}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyValue label={loc.guildId} value={settings.guildId} />
            <ReadOnlyValue label={loc.guildName} value={settings.guildName ?? "—"} />
            <ReadOnlyValue label={loc.access} value={settings.accessRole} />
            <ReadOnlyValue label={loc.updated} value={formatDate(settings.updatedAt)} />
          </div>

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
              {saving ? loc.saving : loc.saveChanges}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
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
                  Target
                  <Select
                    onChange={(e) => {
                      const targetType = e.target.value === "role" ? "role" : "user";
                      setGrantTargetType(targetType);
                      setGrantTargetId("");
                    }}
                    value={grantTargetType}
                  >
                    <option value="user">User</option>
                    <option value="role">Role</option>
                  </Select>
                </label>

                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {grantTargetType === "role" ? "Role" : "User ID"}
                  {grantTargetType === "role" && settings.availableRoles?.length ? (
                    <Select
                      onChange={(e) => setGrantTargetId(e.target.value)}
                      value={grantTargetId}
                    >
                      <option value="">Select role</option>
                      {settings.availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      onChange={(e) => setGrantTargetId(e.target.value)}
                      placeholder={grantTargetType === "role" ? "Role ID" : "User ID"}
                      value={grantTargetId}
                    />
                  )}
                </label>

                <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Role
                  <Select
                    onChange={(e) => setGrantRole(e.target.value === "admin" ? "admin" : "viewer")}
                    value={grantRole}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </Select>
                </label>
              </div>

              <div className="flex justify-end">
                <Button disabled={savingGrant} onClick={saveAccessGrant} size="sm" type="button">
                  <Plus className="h-3.5 w-3.5" />
                  {savingGrant ? "Saving" : "Save Grant"}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-zinc-800">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Target</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="w-28">Access</TableHead>
                    <TableHead className="w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessGrants.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center text-zinc-600" colSpan={4}>
                        No explicit dashboard access grants.
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
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
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
                  Existing management role shortcut. Selected roles receive admin access.
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
                    {savingRoles ? loc.savingRoles : loc.saveRoles}
                  </Button>
                </div>
              </div>
            )}
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

async function updateSettings(guildId: string, logMode: string, language: string) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, logMode, language }),
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
