"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MemberPicker } from "../../../components/member-picker";
import { UserMention } from "../../../components/user-mention";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { Select } from "../../../components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../../../components/ui/table";
import type { DashboardAccessGrant, GrantableAccessRole } from "../access-grants";
import {
  accessGrantKey,
  formatGrantTarget,
  type DashboardLoc,
  type DiscordRole,
  type SettingsResponse
} from "./shared";

interface AccessGrantsTabProps {
  settings: SettingsResponse;
  accessGrants: DashboardAccessGrant[];
  grantTargetType: "user" | "role";
  grantTargetId: string;
  managementRoleIds: string[];
  savingGrant: boolean;
  savingRoles: boolean;
  deletingGrantKey: string | null;
  confirmRoleRemoval: boolean;
  loc: DashboardLoc;
  onGrantTargetTypeChange: (value: "user" | "role") => void;
  onGrantTargetIdChange: (value: string) => void;
  onManagementRoleChange: (id: string, checked: boolean) => void;
  onSaveAccessGrant: () => void;
  onDeleteAccessGrant: (grant: DashboardAccessGrant) => void;
  onUpdateAccessGrantRole: (grant: DashboardAccessGrant, role: GrantableAccessRole) => void;
  onRequestSaveManagementRoles: () => void;
  onConfirmRoleRemoval: () => void;
  onCancelRoleRemoval: () => void;
}

export function AccessGrantsTab({
  settings,
  accessGrants,
  grantTargetType,
  grantTargetId,
  managementRoleIds,
  savingGrant,
  savingRoles,
  deletingGrantKey,
  confirmRoleRemoval,
  loc,
  onGrantTargetTypeChange,
  onGrantTargetIdChange,
  onManagementRoleChange,
  onSaveAccessGrant,
  onDeleteAccessGrant,
  onUpdateAccessGrantRole,
  onRequestSaveManagementRoles,
  onConfirmRoleRemoval,
  onCancelRoleRemoval
}: AccessGrantsTabProps) {
  const availableRoles = settings.availableRoles as DiscordRole[] | undefined;
  const adminGrants = accessGrants.filter((g) => g.role === "admin");
  const [pendingDeleteGrant, setPendingDeleteGrant] = useState<DashboardAccessGrant | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const userIds = adminGrants
      .filter((g) => g.targetType === "user")
      .map((g) => g.targetId);
    if (userIds.length === 0) {
      setUserNames({});
      return;
    }

    setUserNames(null);
    fetch(`/api/discord/users?ids=${userIds.join(",")}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, { globalName: string | null; username: string }>) => {
        const names: Record<string, string> = {};
        for (const [id, user] of Object.entries(data)) {
          names[id] = user.globalName ?? user.username;
        }
        setUserNames(names);
      })
      .catch((e: unknown) => { console.error("AccessGrantsTab: user name fetch failed", e); setUserNames({}); });
  }, [accessGrants]);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{loc.dashboardAccess}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-xs text-[#b5bac1]">{loc.dashboardAccessNote}</p>

        <div className="grid gap-3 rounded-md border border-[#1e1f22] bg-[#1e1f22] p-3">
          <div className="grid gap-2 sm:grid-cols-[110px_1fr]">
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
              {loc.accessGrantTarget}
              <Select
                onChange={(e) => {
                  const targetType = e.target.value === "role" ? "role" : "user";
                  onGrantTargetTypeChange(targetType);
                  onGrantTargetIdChange("");
                }}
                value={grantTargetType}
              >
                <option value="user">{loc.accessGrantUser}</option>
                <option value="role">{loc.accessGrantRole}</option>
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#b5bac1]">
              {grantTargetType === "role" ? loc.accessGrantRole : loc.accessGrantUserId}
              {grantTargetType === "role" ? (
                availableRoles?.length ? (
                  <Select
                    onChange={(e) => onGrantTargetIdChange(e.target.value)}
                    value={grantTargetId}
                  >
                    <option value="">{loc.accessGrantSelectRole}</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </Select>
                ) : null
              ) : (
                <MemberPicker
                  guildId={settings.guildId}
                  value={grantTargetId}
                  onChange={onGrantTargetIdChange}
                />
              )}
            </label>

          </div>

          <div className="flex justify-end">
            <Button disabled={savingGrant} onClick={onSaveAccessGrant} size="sm" type="button">
              <Plus className="h-3.5 w-3.5" />
              {savingGrant ? loc.saving : loc.accessGrantSave}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-[#1e1f22]">
          {userNames === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#80848e]">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              ユーザー情報を読み込み中...
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-24">{loc.accessGrantTarget}</TableHead>
                <TableHead scope="col">{loc.accessGrantId}</TableHead>
                <TableHead scope="col" className="w-20">{loc.accessGrantAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminGrants.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-[#80848e]" colSpan={3}>
                    {loc.noAccessGrants}
                  </TableCell>
                </TableRow>
              ) : adminGrants.map((grant) => (
                <TableRow key={accessGrantKey(grant)}>
                  <TableCell className="capitalize text-[#b5bac1]">{grant.targetType}</TableCell>
                  <TableCell>
                    {grant.targetType === "user" ? (
                      <UserMention userId={grant.targetId} actorName={userNames[grant.targetId] ?? null} />
                    ) : (
                      <span className="break-all text-sm text-[#dbdee1]">
                        {formatGrantTarget(grant, availableRoles)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      aria-label="アクセス権限を削除"
                      disabled={deletingGrantKey === accessGrantKey(grant)}
                      onClick={() => setPendingDeleteGrant(grant)}
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
          )}
        </div>

        {availableRoles !== undefined && (
          <div className="grid gap-3 border-t border-[#1e1f22] pt-4">
            <p className="text-xs text-[#b5bac1]">{loc.managementRoleShortcutNote}</p>
            <div className="flex flex-col gap-1.5">
              {availableRoles.map((role) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-[#1e1f22] px-3 py-2 hover:border-[#3f4147]"
                  key={role.id}
                >
                  <input
                    checked={managementRoleIds.includes(role.id)}
                    className="h-4 w-4 accent-green-500"
                    onChange={(e) => onManagementRoleChange(role.id, e.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm text-[#dbdee1]">{role.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button disabled={savingRoles} onClick={onRequestSaveManagementRoles} size="sm" type="button">
                <Save className="h-3.5 w-3.5" />
                {savingRoles ? loc.savingRoles : loc.saveRoles}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {pendingDeleteGrant && (
      <ConfirmDialog
        title="アクセス権限を削除しますか？"
        description={`${formatGrantTarget(pendingDeleteGrant, availableRoles)} の権限を削除します。`}
        onConfirm={() => {
          onDeleteAccessGrant(pendingDeleteGrant);
          setPendingDeleteGrant(null);
        }}
        onCancel={() => setPendingDeleteGrant(null)}
      />
    )}

    {confirmRoleRemoval && (
      <ConfirmDialog
        title="管理ロールを削除しますか？"
        description="既存の管理ロールを外すと、そのロールを持つユーザーがダッシュボードにアクセスできなくなります。"
        confirmLabel="保存"
        onConfirm={onConfirmRoleRemoval}
        onCancel={onCancelRoleRemoval}
      />
    )}
    </>
  );
}
