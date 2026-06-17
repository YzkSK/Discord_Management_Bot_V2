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

  const userFilter = and(
    eq(dashboardAccessGrants.targetType, "user"),
    eq(dashboardAccessGrants.targetId, input.userId)
  );

  const grantFilter =
    roleIds.length > 0
      ? or(
          userFilter,
          and(
            eq(dashboardAccessGrants.targetType, "role"),
            inArray(dashboardAccessGrants.targetId, roleIds)
          )
        )
      : userFilter;

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
        grantFilter
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

export async function getGuildsWithUserAccessGrant(
  db: DbClient,
  userId: string,
  guildIds: string[]
): Promise<string[]> {
  if (guildIds.length === 0) return [];
  const rows = await db
    .select({ guildId: dashboardAccessGrants.guildId })
    .from(dashboardAccessGrants)
    .where(
      and(
        inArray(dashboardAccessGrants.guildId, guildIds),
        eq(dashboardAccessGrants.targetType, "user"),
        eq(dashboardAccessGrants.targetId, userId)
      )
    );
  return rows.map((r) => r.guildId);
}

export async function getGuildsWithRoleAccessGrants(
  db: DbClient,
  guildIds: string[]
): Promise<string[]> {
  if (guildIds.length === 0) return [];
  const rows = await db
    .selectDistinct({ guildId: dashboardAccessGrants.guildId })
    .from(dashboardAccessGrants)
    .where(
      and(
        inArray(dashboardAccessGrants.guildId, guildIds),
        eq(dashboardAccessGrants.targetType, "role")
      )
    );
  return rows.map((r) => r.guildId);
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
