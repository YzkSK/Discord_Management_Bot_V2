import {
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
  ownerId: string | undefined;
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

  if (input.ownerId === input.userId) {
    return "owner";
  }

  const grantInput = {
    guildId: input.guildId,
    userId: input.userId,
    ...(input.roleIds ? { roleIds: input.roleIds } : {})
  };
  const grants = await listDashboardAccessGrants(input.db, grantInput);

  return maxDashboardAccessRole(grants.map((grant) => grant.role));
}
