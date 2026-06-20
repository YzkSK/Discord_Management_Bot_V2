"use client";

import { useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { fetchSettings, toSettingsError } from "../../lib/settings-api";
import { AccessGrantsTab } from "./components/AccessGrantsTab";
import { LoadingSpinner } from "../../components/loading-spinner";
import { useAccessGrants } from "./hooks/useAccessGrants";
import type { SettingsResponse } from "./components/shared";

export type { SettingsResponse };

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loc = getDashboardLocale(uiLang);
  const isOwner = settings?.accessRole === "owner";
  const access = useAccessGrants(settings?.guildId ?? null, isOwner, loc, setError, setMessage);

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
  }, []);

  useEffect(() => {
    fetchSettings(guildId)
      .then((data) => {
        setSettings(data);
        access.initManagementRoles(data.dashboardManagementRoleIds);
      })
      .catch((e: unknown) => setError(toSettingsError(e)))
      .finally(() => setLoading(false));
  }, [guildId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingSpinner />;

  if (!settings) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error ?? loc.failedToLoadSettings}
      </div>
    );
  }

  return (
    <section className="max-w-3xl grid gap-4">
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
    </section>
  );
}
