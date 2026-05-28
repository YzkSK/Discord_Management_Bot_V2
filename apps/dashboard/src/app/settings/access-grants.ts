import type {
  DashboardAccessRole,
  DashboardAccessTargetType
} from "@discord-bot/shared";

export type GrantableAccessRole = Exclude<DashboardAccessRole, "owner">;

export interface DashboardAccessGrant {
  id: string;
  guildId: string;
  targetType: DashboardAccessTargetType;
  targetId: string;
  role: GrantableAccessRole;
  createdAt: string;
  updatedAt: string;
}

export interface AccessGrantTarget {
  guildId: string;
  targetType: DashboardAccessTargetType;
  targetId: string;
}

export interface AccessGrantFormState extends AccessGrantTarget {
  role: GrantableAccessRole;
}

export function toAccessGrantPayload(input: AccessGrantFormState) {
  return {
    guildId: input.guildId.trim(),
    targetType: input.targetType,
    targetId: input.targetId.trim(),
    role: input.role
  };
}

export function upsertAccessGrant(
  grants: DashboardAccessGrant[],
  grant: DashboardAccessGrant
) {
  const existingIndex = grants.findIndex((item) => isSameGrantTarget(item, grant));

  if (existingIndex === -1) {
    return [grant, ...grants];
  }

  return grants.map((item, index) => (index === existingIndex ? grant : item));
}

export function removeAccessGrant(
  grants: DashboardAccessGrant[],
  target: AccessGrantTarget
) {
  return grants.filter((grant) => !isSameGrantTarget(grant, target));
}

function isSameGrantTarget(
  grant: AccessGrantTarget,
  target: AccessGrantTarget
) {
  return (
    grant.guildId === target.guildId &&
    grant.targetType === target.targetType &&
    grant.targetId === target.targetId
  );
}
