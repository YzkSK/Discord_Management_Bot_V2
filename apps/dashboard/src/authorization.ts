import {
  getGuildManagementRoleIds,
  listDashboardAccessGrants,
  type DbClient
} from "@discord-bot/db";
import {
  hasDashboardAccessRole,
  maxDashboardAccessRole,
  type DashboardAccessRole
} from "@discord-bot/shared";

export interface ResolveDashboardAccessInput {
  db: DbClient;
  guildId: string;
  userId: string | undefined;
  isGuildOwner?: boolean;
  roleIds?: string[];
  requiredRole?: DashboardAccessRole;
}

export async function resolveDashboardAccess(
  input: ResolveDashboardAccessInput
) {
  if (!input.userId) {
    return {
      allowed: false,
      access: null
    };
  }

  const requiredRole = input.requiredRole ?? "viewer";
  const accessRole = await resolveDashboardAccessRole(input);

  return {
    allowed: hasDashboardAccessRole(accessRole, requiredRole),
    role: accessRole
  };
}

async function resolveDashboardAccessRole(input: ResolveDashboardAccessInput) {
  if (!input.userId) {
    return null;
  }

  if (input.isGuildOwner) {
    return "owner";
  }

  const roleIds = input.roleIds ?? [];

  const [managementRoleIds, grants] = await Promise.all([
    getGuildManagementRoleIds(input.db, input.guildId),
    listDashboardAccessGrants(input.db, {
      guildId: input.guildId,
      userId: input.userId,
      ...(roleIds.length > 0 ? { roleIds } : {})
    })
  ]);

  const hasManagementRole =
    managementRoleIds.length > 0 &&
    roleIds.some((id) => managementRoleIds.includes(id));

  return maxDashboardAccessRole([
    hasManagementRole ? "admin" : null,
    ...grants.map((g) => g.role)
  ]);
}
