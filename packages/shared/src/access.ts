export const dashboardAccessRoles = ["viewer", "admin", "owner"] as const;
export const dashboardAccessTargetTypes = ["user", "role"] as const;

export type DashboardAccessRole = (typeof dashboardAccessRoles)[number];
export type DashboardAccessTargetType =
  (typeof dashboardAccessTargetTypes)[number];

const dashboardAccessRoleRank: Record<DashboardAccessRole, number> = {
  viewer: 1,
  admin: 2,
  owner: 3
};

export function hasDashboardAccessRole(
  actualRole: DashboardAccessRole | null | undefined,
  requiredRole: DashboardAccessRole
) {
  if (!actualRole) {
    return false;
  }

  return (
    dashboardAccessRoleRank[actualRole] >= dashboardAccessRoleRank[requiredRole]
  );
}

export function maxDashboardAccessRole(
  roles: Array<DashboardAccessRole | null | undefined>
) {
  return roles.reduce<DashboardAccessRole | null>((maxRole, role) => {
    if (!role) {
      return maxRole;
    }

    if (!maxRole) {
      return role;
    }

    return dashboardAccessRoleRank[role] > dashboardAccessRoleRank[maxRole]
      ? role
      : maxRole;
  }, null);
}
