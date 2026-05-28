import type {
  DashboardAccessRole,
  DashboardAccessTargetType
} from "@discord-bot/shared";
import { and, eq, inArray, or, sql } from "drizzle-orm";

import type { DbClient } from "../client.js";
import { dashboardAccessGrants } from "../schema/index.js";

export type GrantableDashboardAccessRole = Exclude<
  DashboardAccessRole,
  "owner"
>;

export interface EnsureDashboardAccessGrantInput {
  guildId: string;
  targetType: DashboardAccessTargetType;
  targetId: string;
  role: GrantableDashboardAccessRole;
}

export interface ListDashboardAccessGrantsInput {
  guildId: string;
  userId: string;
  roleIds?: string[];
}

export interface ListGuildDashboardAccessGrantsInput {
  guildId: string;
}

export interface DeleteDashboardAccessGrantInput {
  guildId: string;
  targetType: DashboardAccessTargetType;
  targetId: string;
}

export async function ensureDashboardAccessGrant(
  db: DbClient,
  input: EnsureDashboardAccessGrantInput
) {
  const [grant] = await db
    .insert(dashboardAccessGrants)
    .values({
      guildId: input.guildId,
      targetType: input.targetType,
      targetId: input.targetId,
      role: input.role
    })
    .onConflictDoUpdate({
      target: [
        dashboardAccessGrants.guildId,
        dashboardAccessGrants.targetType,
        dashboardAccessGrants.targetId
      ],
      set: {
        role: input.role,
        updatedAt: sql`now()`
      }
    })
    .returning();

  if (!grant) {
    throw new Error("Failed to ensure dashboard access grant.");
  }

  return grant;
}

export async function listDashboardAccessGrants(
  db: DbClient,
  input: ListDashboardAccessGrantsInput
) {
  const roleIds = input.roleIds ?? [];
  const targetFilters = [
    and(
      eq(dashboardAccessGrants.targetType, "user"),
      eq(dashboardAccessGrants.targetId, input.userId)
    )
  ];

  if (roleIds.length > 0) {
    targetFilters.push(
      and(
        eq(dashboardAccessGrants.targetType, "role"),
        inArray(dashboardAccessGrants.targetId, roleIds)
      )
    );
  }

  return db
    .select({
      guildId: dashboardAccessGrants.guildId,
      targetType: dashboardAccessGrants.targetType,
      targetId: dashboardAccessGrants.targetId,
      role: dashboardAccessGrants.role
    })
    .from(dashboardAccessGrants)
    .where(
      and(
        eq(dashboardAccessGrants.guildId, input.guildId),
        or(...targetFilters)
      )
    )
    .then((grants) =>
      grants.map((grant) => ({
        ...grant,
        targetType: grant.targetType as DashboardAccessTargetType,
        role: grant.role as GrantableDashboardAccessRole
      }))
    );
}

export async function listGuildDashboardAccessGrants(
  db: DbClient,
  input: ListGuildDashboardAccessGrantsInput
) {
  return db
    .select({
      id: dashboardAccessGrants.id,
      guildId: dashboardAccessGrants.guildId,
      targetType: dashboardAccessGrants.targetType,
      targetId: dashboardAccessGrants.targetId,
      role: dashboardAccessGrants.role,
      createdAt: dashboardAccessGrants.createdAt,
      updatedAt: dashboardAccessGrants.updatedAt
    })
    .from(dashboardAccessGrants)
    .where(eq(dashboardAccessGrants.guildId, input.guildId))
    .then((grants) =>
      grants.map((grant) => ({
        ...grant,
        targetType: grant.targetType as DashboardAccessTargetType,
        role: grant.role as GrantableDashboardAccessRole
      }))
    );
}

export async function deleteDashboardAccessGrant(
  db: DbClient,
  input: DeleteDashboardAccessGrantInput
) {
  const [grant] = await db
    .delete(dashboardAccessGrants)
    .where(
      and(
        eq(dashboardAccessGrants.guildId, input.guildId),
        eq(dashboardAccessGrants.targetType, input.targetType),
        eq(dashboardAccessGrants.targetId, input.targetId)
      )
    )
    .returning({
      guildId: dashboardAccessGrants.guildId,
      targetType: dashboardAccessGrants.targetType,
      targetId: dashboardAccessGrants.targetId,
      role: dashboardAccessGrants.role
    });

  return grant
    ? {
        ...grant,
        targetType: grant.targetType as DashboardAccessTargetType,
        role: grant.role as GrantableDashboardAccessRole
      }
    : null;
}
