import { ttsDictionaryScopes, type TtsDictionaryScope } from "@discord-bot/db";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false as const, error: `${field} is required.` };
  }
  return { ok: true as const, value: value.trim() };
}

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type TtsSpeakerPatchValue =
  | {
      guildId: string;
      kind: "speaker";
      speakerId: number;
      target: "guild-default";
    }
  | {
      guildId: string;
      kind: "speaker";
      speakerId: number;
      target: "user";
      userId: string;
    };

export type TtsSpeakerDeleteValue =
  | {
      guildId: string;
      kind: "speaker";
      target: "guild-default";
    }
  | {
      guildId: string;
      kind: "speaker";
      target: "user";
      userId: string;
    };

export interface TtsDictionaryPatchValue {
  fromText: string;
  guildId: string;
  isEnabled: boolean;
  kind: "dictionary";
  priority: number;
  scope: TtsDictionaryScope;
  toText: string;
  userId: string | null;
}

export interface TtsDictionaryDeleteValue {
  fromText: string;
  guildId: string;
  kind: "dictionary";
  scope: TtsDictionaryScope;
  userId: string | null;
}

export function parseTtsSpeakerPatchBody(
  body: unknown
): ParseResult<TtsSpeakerPatchValue> {
  const base = parseBaseSpeakerBody(body);
  if (!base.ok) return base;

  const speakerId = readNonNegativeInteger(base.value.body.speakerId, "speakerId");
  if (!speakerId.ok) return speakerId;

  if (base.value.value.target === "guild-default") {
    return {
      ok: true,
      value: { ...base.value.value, speakerId: speakerId.value }
    };
  }

  return {
    ok: true,
    value: { ...base.value.value, speakerId: speakerId.value }
  };
}

export function parseTtsSpeakerDeleteBody(
  body: unknown
): ParseResult<TtsSpeakerDeleteValue> {
  const base = parseBaseSpeakerBody(body);
  if (!base.ok) return base;
  return { ok: true, value: base.value.value };
}

export function parseTtsDictionaryPatchBody(
  body: unknown
): ParseResult<TtsDictionaryPatchValue> {
  const identity = parseDictionaryIdentity(body);
  if (!identity.ok) return identity;

  const toText = readRequiredString(identity.value.body.toText, "toText");
  if (!toText.ok) return toText;

  const priority =
    identity.value.body.priority === undefined
      ? { ok: true as const, value: 0 }
      : readNonNegativeInteger(identity.value.body.priority, "priority");
  if (!priority.ok) return priority;

  const isEnabled =
    typeof identity.value.body.isEnabled === "boolean"
      ? identity.value.body.isEnabled
      : true;

  return {
    ok: true,
    value: {
      ...identity.value.value,
      isEnabled,
      kind: "dictionary",
      priority: priority.value,
      toText: toText.value
    }
  };
}

export function parseTtsDictionaryDeleteBody(
  body: unknown
): ParseResult<TtsDictionaryDeleteValue> {
  const identity = parseDictionaryIdentity(body);
  if (!identity.ok) return identity;

  return {
    ok: true,
    value: {
      fromText: identity.value.value.fromText,
      guildId: identity.value.value.guildId,
      kind: "dictionary",
      scope: identity.value.value.scope,
      userId: identity.value.value.userId
    }
  };
}

function parseBaseSpeakerBody(
  body: unknown
): ParseResult<{
  body: Record<string, unknown>;
  value: TtsSpeakerDeleteValue;
}> {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be an object." };
  }

  if (body.kind !== "speaker") {
    return { ok: false, error: "kind must be speaker." };
  }

  const guildId = readRequiredString(body.guildId, "guildId");
  if (!guildId.ok) return guildId;

  if (body.target === "guild-default") {
    return {
      ok: true,
      value: {
        body,
        value: {
          guildId: guildId.value,
          kind: "speaker",
          target: "guild-default"
        }
      }
    };
  }

  if (body.target === "user") {
    const userId = readRequiredString(body.userId, "userId");
    if (!userId.ok) return userId;

    return {
      ok: true,
      value: {
        body,
        value: {
          guildId: guildId.value,
          kind: "speaker",
          target: "user",
          userId: userId.value
        }
      }
    };
  }

  return { ok: false, error: "target must be guild-default or user." };
}

function parseDictionaryIdentity(
  body: unknown
): ParseResult<{
  body: Record<string, unknown>;
  value: Omit<TtsDictionaryPatchValue, "isEnabled" | "priority" | "toText">;
}> {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be an object." };
  }

  if (body.kind !== "dictionary") {
    return { ok: false, error: "kind must be dictionary." };
  }

  const guildId = readRequiredString(body.guildId, "guildId");
  if (!guildId.ok) return guildId;

  const scope = readDictionaryScope(body.scope);
  if (!scope.ok) return scope;

  const fromText = readRequiredString(body.fromText, "fromText");
  if (!fromText.ok) return fromText;

  const userId =
    scope.value === "user"
      ? readRequiredString(body.userId, "userId")
      : { ok: true as const, value: null };
  if (!userId.ok) {
    return {
      ok: false,
      error: "userId is required for user dictionary entries."
    };
  }

  return {
    ok: true,
    value: {
      body,
      value: {
        fromText: fromText.value,
        guildId: guildId.value,
        kind: "dictionary",
        scope: scope.value,
        userId: userId.value
      }
    }
  };
}

function readDictionaryScope(value: unknown) {
  if (
    typeof value !== "string" ||
    !ttsDictionaryScopes.includes(value as TtsDictionaryScope)
  ) {
    return { ok: false as const, error: "scope must be guild or user." };
  }

  return { ok: true as const, value: value as TtsDictionaryScope };
}

function readNonNegativeInteger(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    return {
      ok: false as const,
      error: `${field} must be a non-negative integer.`
    };
  }

  return { ok: true as const, value: Number(value) };
}

