import {
  isDashboardLogMode,
  isGuildLanguage,
  type DashboardLogMode,
  type GuildLanguage
} from "@discord-bot/shared";

export type SettingsPatchValue =
  | {
      guildId: string;
      section: "logs";
      values: {
        logMode?: DashboardLogMode;
        language?: GuildLanguage;
      };
    }
  | {
      guildId: string;
      section: "tempVc";
      values: {
        createChannelId?: string | null;
        categoryId?: string | null;
      };
    }
  | {
      guildId: string;
      section: "tts";
      values: {
        textChannelId?: string | null;
      };
    }
  | {
      guildId: string;
      section: "recruitment";
      values: {
        channelId?: string | null;
      };
    };

type ParseResult =
  | { ok: true; value: SettingsPatchValue }
  | { ok: false; error: string };

export function parseSettingsPatchBody(body: unknown): ParseResult {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const guildId = readRequiredString(body.guildId, "guildId");
  if (!guildId.ok) return guildId;

  if (!("section" in body)) {
    return parseLegacyLogsPatchBody(body, guildId.value);
  }

  const section = typeof body.section === "string" ? body.section : "";
  const values = isObject(body.values) ? body.values : null;

  if (!values) {
    return { ok: false, error: "values must be an object." };
  }

  if (section === "logs") {
    return parseLogsValues(guildId.value, values);
  }

  if (section === "tempVc") {
    const valuesPatch = omitUndefined({
      createChannelId: readOptionalNullableString(values.createChannelId),
      categoryId: readOptionalNullableString(values.categoryId)
    });

    return {
      ok: true,
      value: {
        guildId: guildId.value,
        section,
        values: valuesPatch
      }
    };
  }

  if (section === "tts") {
    const valuesPatch = omitUndefined({
      textChannelId: readOptionalNullableString(values.textChannelId)
    });

    return {
      ok: true,
      value: {
        guildId: guildId.value,
        section,
        values: valuesPatch
      }
    };
  }

  if (section === "recruitment") {
    const valuesPatch = omitUndefined({
      channelId: readOptionalNullableString(values.channelId)
    });

    return {
      ok: true,
      value: {
        guildId: guildId.value,
        section,
        values: valuesPatch
      }
    };
  }

  return { ok: false, error: "Invalid settings section." };
}

function parseLegacyLogsPatchBody(
  body: Record<string, unknown>,
  guildId: string
): ParseResult {
  const logMode = readLogMode(body.logMode);
  if (!logMode.ok) return logMode;

  const language = body.language === undefined
    ? undefined
    : readLanguage(body.language);
  if (language && !language.ok) return language;

  return {
    ok: true,
    value: {
      guildId,
      section: "logs",
      values: {
        logMode: logMode.value,
        ...(language?.ok ? { language: language.value } : {})
      }
    }
  };
}

function parseLogsValues(
  guildId: string,
  values: Record<string, unknown>
): ParseResult {
  const parsedLogMode = values.logMode === undefined
    ? undefined
    : readLogMode(values.logMode);
  if (parsedLogMode && !parsedLogMode.ok) return parsedLogMode;

  const parsedLanguage = values.language === undefined
    ? undefined
    : readLanguage(values.language);
  if (parsedLanguage && !parsedLanguage.ok) return parsedLanguage;

  if (!parsedLogMode && !parsedLanguage) {
    return { ok: false, error: "logs values must include logMode or language." };
  }

  return {
    ok: true,
    value: {
      guildId,
      section: "logs",
      values: {
        ...(parsedLogMode?.ok ? { logMode: parsedLogMode.value } : {}),
        ...(parsedLanguage?.ok ? { language: parsedLanguage.value } : {})
      }
    }
  };
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false as const, error: `${field} is required.` };
  }

  return { ok: true as const, value: value.trim() };
}

function readLogMode(value: unknown) {
  if (typeof value !== "string" || !isDashboardLogMode(value.trim())) {
    return { ok: false as const, error: "Invalid logMode." };
  }

  return { ok: true as const, value: value.trim() as DashboardLogMode };
}

function readLanguage(value: unknown) {
  if (typeof value !== "string" || !isGuildLanguage(value.trim())) {
    return { ok: false as const, error: "Invalid language." };
  }

  return { ok: true as const, value: value.trim() as GuildLanguage };
}

function readOptionalNullableString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as {
    [K in keyof T as undefined extends T[K] ? K : K]?: Exclude<T[K], undefined>;
  };
}
