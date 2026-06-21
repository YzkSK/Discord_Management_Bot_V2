"use client";

import { useCallback, useEffect, useState } from "react";
import type { GuildLanguage } from "@discord-bot/shared";
import { getDashboardLocale, detectBrowserLanguage } from "../../lib/locale";
import { fetchSettings, toSettingsError } from "../../lib/settings-api";
import { AccessGrantsTab } from "./components/AccessGrantsTab";
import { ErrorAlert } from "../../components/error-alert";
import { LoadingSpinner } from "../../components/loading-spinner";
import { useAccessGrants } from "./hooks/useAccessGrants";
import type { SettingsResponse } from "./components/shared";

export type { SettingsResponse };

export function SettingsPanel({ guildId }: { guildId: string }) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loc = getDashboardLocale(uiLang);
  const isOwner = settings?.accessRole === "owner";
  const access = useAccessGrants(settings?.guildId ?? null, isOwner, loc);

  useEffect(() => {
    setUiLang(detectBrowserLanguage());
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
        confirmRoleRemoval={access.confirmRoleRemoval}
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
        onConfirmRoleRemoval={() => void access.doSaveManagementRoles()}
        onCancelRoleRemoval={() => access.setConfirmRoleRemoval(false)}
      />
    </section>
  );
}
