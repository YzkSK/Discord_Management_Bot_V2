import type {
  DashboardAccessRole,
  DashboardAccessTargetType
} from "@discord-bot/shared";
import { hasDashboardAccessRole, maxDashboardAccessRole } from "@discord-bot/shared";

export interface DashboardCommandAccessGrant {
  role: Exclude<DashboardAccessRole, "owner">;
  targetType: DashboardAccessTargetType;
}

export interface ResolveDashboardCommandAccessRoleInput {
  grants: DashboardCommandAccessGrant[];
  isGuildOwner: boolean;
}

export function resolveDashboardCommandAccessRole(
  input: ResolveDashboardCommandAccessRoleInput
) {
  if (input.isGuildOwner) {
    return "owner";
  }

  return maxDashboardAccessRole(input.grants.map((grant) => grant.role));
}

export function hasDashboardAdminCommandAccess(
  role: DashboardAccessRole | null
) {
  return hasDashboardAccessRole(role, "admin");
}
