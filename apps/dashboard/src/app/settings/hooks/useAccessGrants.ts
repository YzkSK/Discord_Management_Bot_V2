"use client";

import { useEffect, useRef, useState } from "react";
import {
  removeAccessGrant,
  toAccessGrantPayload,
  upsertAccessGrant,
  type DashboardAccessGrant,
  type GrantableAccessRole
} from "../access-grants";
import type { DashboardLoc } from "../components/shared";

function accessGrantKey(grant: { guildId: string; targetType: string; targetId: string }) {
  return `${grant.guildId}:${grant.targetType}:${grant.targetId}`;
}

export function useAccessGrants(
  guildId: string | null,
  isOwner: boolean,
  loc: DashboardLoc,
  setError: (msg: string | null) => void,
  setMessage: (msg: string | null) => void
) {
  const [accessGrants, setAccessGrants] = useState<DashboardAccessGrant[]>([]);
  const [grantTargetType, setGrantTargetType] = useState<"user" | "role">("user");
  const [grantTargetId, setGrantTargetId] = useState("");
  const [grantRole, setGrantRole] = useState<GrantableAccessRole>("viewer");
  const [managementRoleIds, setManagementRoleIds] = useState<string[]>([]);
  const [savingGrant, setSavingGrant] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [deletingGrantKey, setDeletingGrantKey] = useState<string | null>(null);
  const [confirmRoleRemoval, setConfirmRoleRemoval] = useState(false);

  const savedManagementRoleIdsRef = useRef<string[]>([]);

  function initManagementRoles(ids: string[]) {
    savedManagementRoleIdsRef.current = ids;
    setManagementRoleIds(ids);
  }

  useEffect(() => {
    if (!guildId || !isOwner) return;
    fetchAccessGrants(guildId)
      .then(setAccessGrants)
      .catch((e: unknown) => setError(toErrorMessage(e)));
  }, [guildId, isOwner]); // eslint-disable-line react-hooks/exhaustive-deps

  function requestSaveManagementRoles() {
    const removedAny = savedManagementRoleIdsRef.current.some(
      (id) => !managementRoleIds.includes(id)
    );
    if (removedAny) {
      setConfirmRoleRemoval(true);
    } else {
      void doSaveManagementRoles();
    }
  }

  async function doSaveManagementRoles() {
    if (!guildId) return;
    setConfirmRoleRemoval(false);
    setSavingRoles(true); setError(null); setMessage(null);
    try {
      await updateManagementRoles(guildId, managementRoleIds);
      savedManagementRoleIdsRef.current = managementRoleIds;
      setMessage(loc.accessRolesUpdated);
    } catch (e) { setError(toErrorMessage(e)); } finally { setSavingRoles(false); }
  }

  async function saveAccessGrant() {
    if (!guildId) return;
    const payload = toAccessGrantPayload({
      guildId,
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
    if (!guildId) return;
    const key = accessGrantKey(grant);
    setDeletingGrantKey(key); setError(null); setMessage(null);
    try {
      await deleteDashboardAccessGrant({
        guildId,
        targetType: grant.targetType,
        targetId: grant.targetId
      });
      setAccessGrants((current) => removeAccessGrant(current, grant));
      setMessage(loc.accessGrantDeleted);
    } catch (e) { setError(toErrorMessage(e)); } finally { setDeletingGrantKey(null); }
  }

  async function updateAccessGrantRole(grant: DashboardAccessGrant, role: GrantableAccessRole) {
    if (!guildId || grant.role === role) return;
    setError(null); setMessage(null);
    try {
      const updatedGrant = await upsertDashboardAccessGrant({
        guildId,
        targetType: grant.targetType,
        targetId: grant.targetId,
        role
      });
      setAccessGrants((current) => upsertAccessGrant(current, updatedGrant));
      setMessage(loc.accessGrantUpdated);
    } catch (e) { setError(toErrorMessage(e)); }
  }

  return {
    accessGrants,
    grantTargetType,
    setGrantTargetType,
    grantTargetId,
    setGrantTargetId,
    grantRole,
    setGrantRole,
    managementRoleIds,
    setManagementRoleIds,
    savingGrant,
    savingRoles,
    deletingGrantKey,
    confirmRoleRemoval,
    setConfirmRoleRemoval,
    initManagementRoles,
    requestSaveManagementRoles,
    doSaveManagementRoles,
    saveAccessGrant,
    deleteAccessGrant,
    updateAccessGrantRole,
  };
}

async function fetchAccessGrants(guildId: string): Promise<DashboardAccessGrant[]> {
  const query = new URLSearchParams({ guildId });
  const r = await fetch(`/api/dashboard-access?${query.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load dashboard access grants (${r.status})`);
  const data = (await r.json()) as { grants: DashboardAccessGrant[] };
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

async function updateManagementRoles(guildId: string, roleIds: string[]) {
  const r = await fetch("/api/settings", {
    body: JSON.stringify({ guildId, dashboardManagementRoleIds: roleIds }),
    headers: { "content-type": "application/json" },
    method: "PATCH"
  });
  if (!r.ok) throw new Error(`Failed to save roles (${r.status})`);
}

function toErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Access settings request failed";
}
