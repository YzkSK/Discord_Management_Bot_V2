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

export async function batchEnsureViewerAccess(
  db: DbClient,
  guildId: string,
  userIds: string[]
) {
  if (userIds.length === 0) return;

  const CHUNK = 500;
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    await db
      .insert(dashboardAccessGrants)
      .values(
        chunk.map((userId) => ({
          guildId,
          targetType: "user" as const,
          targetId: userId,
          role: "viewer" as const,
        }))
      )
      .onConflictDoNothing();
  }
}

// 退出時: ユーザーの全 grant を削除
export async function revokeAllUserGrants(
  db: DbClient,
  guildId: string,
  userId: string
) {
  await db
    .delete(dashboardAccessGrants)
    .where(
      and(
        eq(dashboardAccessGrants.guildId, guildId),
        eq(dashboardAccessGrants.targetType, "user"),
        eq(dashboardAccessGrants.targetId, userId)
      )
    );
}

// 現在のメンバー一覧にいないユーザーの全 grant を一括削除（reconciliation 用）
export async function pruneStaleUserGrants(
  db: DbClient,
  guildId: string,
  currentMemberIds: string[]
) {
  const existing = await db
    .select({ targetId: dashboardAccessGrants.targetId })
    .from(dashboardAccessGrants)
    .where(
      and(
        eq(dashboardAccessGrants.guildId, guildId),
        eq(dashboardAccessGrants.targetType, "user")
      )
    );

  const memberSet = new Set(currentMemberIds);
  const stale = [...new Set(existing.map((r) => r.targetId).filter((id) => !memberSet.has(id)))];
  if (stale.length === 0) return;

  const CHUNK = 500;
  for (let i = 0; i < stale.length; i += CHUNK) {
    await db
      .delete(dashboardAccessGrants)
      .where(
        and(
          eq(dashboardAccessGrants.guildId, guildId),
          eq(dashboardAccessGrants.targetType, "user"),
          inArray(dashboardAccessGrants.targetId, stale.slice(i, i + CHUNK))
        )
      );
  }
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
