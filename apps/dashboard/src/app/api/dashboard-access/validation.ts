import {
  dashboardAccessTargetTypes,
  type DashboardAccessTargetType
} from "@discord-bot/shared";
import type { GrantableDashboardAccessRole } from "@discord-bot/db";

export interface DashboardAccessGrantInput {
  guildId: string;
  targetType: DashboardAccessTargetType;
  targetId: string;
  role: GrantableDashboardAccessRole;
}

export type DashboardAccessGrantDeleteInput = Omit<
  DashboardAccessGrantInput,
  "role"
>;

export type ParseDashboardAccessGrantResult =
  | { ok: true; value: DashboardAccessGrantInput }
  | { ok: false; error: string };

export type ParseDashboardAccessGrantDeleteResult =
  | { ok: true; value: DashboardAccessGrantDeleteInput }
  | { ok: false; error: string };

export function parseDashboardAccessGrantBody(
  body: unknown
): ParseDashboardAccessGrantResult {
  const base = parseGrantTarget(body);

  if (!base.ok) {
    return base;
  }

  const role = stringField(body, "role");

  if (role !== "viewer" && role !== "admin") {
    return { ok: false, error: "role must be viewer or admin." };
  }

  return {
    ok: true,
    value: {
      ...base.value,
      role
    }
  };
}

export function parseDashboardAccessGrantDeleteBody(
  body: unknown
): ParseDashboardAccessGrantDeleteResult {
  return parseGrantTarget(body);
}

function parseGrantTarget(
  body: unknown
): ParseDashboardAccessGrantDeleteResult {
  const guildId = stringField(body, "guildId");
  const targetType = stringField(body, "targetType");
  const targetId = stringField(body, "targetId");

  if (!guildId) {
    return { ok: false, error: "guildId is required." };
  }

  if (!isDashboardAccessTargetType(targetType)) {
    return { ok: false, error: "targetType must be user or role." };
  }

  if (!targetId) {
    return { ok: false, error: "targetId is required." };
  }

  return {
    ok: true,
    value: {
      guildId,
      targetType,
      targetId
    }
  };
}

function stringField(body: unknown, key: string) {
  if (!body || typeof body !== "object" || !(key in body)) {
    return "";
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function isDashboardAccessTargetType(
  value: string
): value is DashboardAccessTargetType {
  return (dashboardAccessTargetTypes as readonly string[]).includes(value);
}
