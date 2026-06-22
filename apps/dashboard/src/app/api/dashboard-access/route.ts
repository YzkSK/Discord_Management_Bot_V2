import {
  createDbConnection,
  deleteDashboardAccessGrant,
  ensureDashboardAccessGrant,
  listGuildDashboardAccessGrants
} from "@discord-bot/db";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeDashboardApi } from "../../../dashboard-auth";
import { optionalParam } from "../../../lib/request-params";
import {
  parseDashboardAccessGrantBody,
  parseDashboardAccessGrantDeleteBody
} from "./validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guildId = optionalParam(request.nextUrl.searchParams, "guildId");
  const authorization = await authorizeDashboardApi({
    request,
    guildId,
    requiredRole: "owner"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();

  try {
    const grants = await listGuildDashboardAccessGrants(dbConnection.db, {
      guildId: authorization.guild.id
    });

    return NextResponse.json({
      guildId: authorization.guild.id,
      accessRole: authorization.role,
      grants: grants.map((grant) => ({
        id: grant.id,
        guildId: grant.guildId,
        targetType: grant.targetType,
        targetId: grant.targetId,
        role: grant.role,
        createdAt: grant.createdAt.toISOString(),
        updatedAt: grant.updatedAt.toISOString()
      }))
    });
  } finally {
    await dbConnection.close();
  }
}

export async function POST(request: NextRequest) {
  return upsertDashboardAccessGrant(request);
}

export async function PATCH(request: NextRequest) {
  return upsertDashboardAccessGrant(request);
}

async function upsertDashboardAccessGrant(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseDashboardAccessGrantBody(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const authorization = await authorizeDashboardApi({
    request,
    guildId: parsed.value.guildId,
    requiredRole: "owner"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();

  try {
    const grant = await ensureDashboardAccessGrant(dbConnection.db, {
      guildId: authorization.guild.id,
      targetType: parsed.value.targetType,
      targetId: parsed.value.targetId,
      role: parsed.value.role
    });

    return NextResponse.json({
      grant: {
        id: grant.id,
        guildId: grant.guildId,
        targetType: grant.targetType,
        targetId: grant.targetId,
        role: grant.role,
        createdAt: grant.createdAt.toISOString(),
        updatedAt: grant.updatedAt.toISOString()
      }
    });
  } finally {
    await dbConnection.close();
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = parseDashboardAccessGrantDeleteBody(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const authorization = await authorizeDashboardApi({
    request,
    guildId: parsed.value.guildId,
    requiredRole: "owner"
  });

  if (!authorization.allowed) {
    return NextResponse.json(
      { error: authorization.error },
      { status: authorization.status }
    );
  }

  const dbConnection = createDbConnection();

  try {
    const grant = await deleteDashboardAccessGrant(dbConnection.db, {
      guildId: authorization.guild.id,
      targetType: parsed.value.targetType,
      targetId: parsed.value.targetId
    });

    return NextResponse.json({
      deleted: grant !== null,
      grant
    });
  } finally {
    await dbConnection.close();
  }
}

