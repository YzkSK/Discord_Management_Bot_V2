"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { Input } from "../../../components/ui/input";
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
  grantRole: GrantableAccessRole;
  managementRoleIds: string[];
  savingGrant: boolean;
  savingRoles: boolean;
  deletingGrantKey: string | null;
  confirmRoleRemoval: boolean;
  loc: DashboardLoc;
  onGrantTargetTypeChange: (value: "user" | "role") => void;
  onGrantTargetIdChange: (value: string) => void;
  onGrantRoleChange: (value: GrantableAccessRole) => void;
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
  grantRole,
  managementRoleIds,
  savingGrant,
  savingRoles,
  deletingGrantKey,
  confirmRoleRemoval,
  loc,
  onGrantTargetTypeChange,
  onGrantTargetIdChange,
  onGrantRoleChange,
  onManagementRoleChange,
  onSaveAccessGrant,
  onDeleteAccessGrant,
  onUpdateAccessGrantRole,
  onRequestSaveManagementRoles,
  onConfirmRoleRemoval,
  onCancelRoleRemoval
}: AccessGrantsTabProps) {
  const availableRoles = settings.availableRoles as DiscordRole[] | undefined;
  const [pendingDeleteGrant, setPendingDeleteGrant] = useState<DashboardAccessGrant | null>(null);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>{loc.dashboardAccess}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-xs text-[#80848e]">{loc.dashboardAccessNote}</p>

        <div className="grid gap-3 rounded-md border border-[#1e1f22] bg-[#1e1f22] p-3">
          <div className="grid gap-2 sm:grid-cols-[110px_1fr_120px]">
            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">
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

            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">
              {grantTargetType === "role" ? loc.accessGrantRole : loc.accessGrantUserId}
              {grantTargetType === "role" && availableRoles?.length ? (
                <Select
                  onChange={(e) => onGrantTargetIdChange(e.target.value)}
                  value={grantTargetId}
                >
                  <option value="">{loc.accessGrantSelectRole}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  onChange={(e) => onGrantTargetIdChange(e.target.value)}
                  placeholder={grantTargetType === "role" ? loc.accessGrantRoleId : loc.accessGrantUserId}
                  value={grantTargetId}
                />
              )}
            </label>

            <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#80848e]">
              {loc.accessGrantRole}
              <Select
                onChange={(e) => onGrantRoleChange(e.target.value === "admin" ? "admin" : "viewer")}
                value={grantRole}
              >
                <option value="viewer">{loc.accessGrantViewer}</option>
                <option value="admin">{loc.accessGrantAdmin}</option>
              </Select>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-24">{loc.accessGrantTarget}</TableHead>
                <TableHead scope="col">{loc.accessGrantId}</TableHead>
                <TableHead scope="col" className="w-28">{loc.accessGrantAccess}</TableHead>
                <TableHead scope="col" className="w-20">{loc.accessGrantAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessGrants.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-[#4e5058]" colSpan={4}>
                    {loc.noAccessGrants}
                  </TableCell>
                </TableRow>
              ) : accessGrants.map((grant) => (
                <TableRow key={accessGrantKey(grant)}>
                  <TableCell className="capitalize text-[#80848e]">{grant.targetType}</TableCell>
                  <TableCell>
                    <span className="break-all font-mono text-xs text-[#dbdee1]">
                      {formatGrantTarget(grant, availableRoles)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      onChange={(e) => {
                        const role = e.target.value === "admin" ? "admin" : "viewer";
                        onUpdateAccessGrantRole(grant, role);
                      }}
                      value={grant.role}
                    >
                      <option value="viewer">{loc.accessGrantViewer}</option>
                      <option value="admin">{loc.accessGrantAdmin}</option>
                    </Select>
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
        </div>

        {availableRoles !== undefined && (
          <div className="grid gap-3 border-t border-[#1e1f22] pt-4">
            <p className="text-xs text-[#80848e]">{loc.managementRoleShortcutNote}</p>
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
