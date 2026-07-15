"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isGuildLanguage } from "@discord-bot/shared";
import type { GuildLanguage } from "@discord-bot/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "../../components/loading-spinner";

import { detectBrowserLanguage, getDashboardLocale } from "../../lib/locale";

const UI_LANG_KEY = "dashboard-ui-lang";

const MAX_PAYLOAD_FIELDS_DISPLAYED = 6;
import {
  dashboardGuildStorageKey,
  normalizeGuildId,
} from "../dashboard-ui";
import {
  eventColorClasses,
  extractActorName,
  extractAuditAction,
  extractChannelName,
  extractTargetId,
  extractTargetName,
  extractVoiceStateChanges,
  formatEventDescription,
  formatRelativeTime,
  getEventColor,
  isObj,
  isRecord,
} from "../../lib/event-display";
import { formatEventDescriptionJSX } from "../../lib/format-event-jsx";
import {
  canViewRawLogPayload,
  getLogCategoryTabs,
  getRealtimeStatusMeta,
} from "./logs-ui";
import { ErrorAlert } from "../../components/error-alert";
import { useLogsData, type LogFilters, type LogItem } from "./hooks/use-logs-data";
import { useLogsRealtime } from "./hooks/use-logs-realtime";
import { LogsChart } from "./components/logs-chart";

const initialFilters: LogFilters = {
  actorId: "",
  eventName: "",
  guildId: "",
  search: "",
};

const categoryTabs = getLogCategoryTabs();


function getPayloadLabels(loc: ReturnType<typeof getDashboardLocale>): Record<string, string> {
  return {
    recruitmentId:    loc.logsRecruitmentId,
    creatorId:        loc.logsCreatorId,
    genre:            loc.logsGenre,
    capacity:         loc.logsCapacity,
    participantCount: loc.logsParticipantCount,
    status:           loc.logsStatusLabel,
    voiceChannelId:   loc.logsVoiceChannelId,
    reason:           loc.logsReason,
  };
}

function formatPayloadFieldValue(key: string, value: unknown): string {
  const str = String(value);
  if (key === "creatorId") return `@${str}`;
  return str;
}

const changeFieldLabels: Record<"ja" | "en", Record<string, string>> = {
  ja: {
    name:                      "名前",
    topic:                     "トピック",
    type:                      "種類",
    parentId:                  "カテゴリ",
    position:                  "順序",
    rateLimitPerUser:          "低速モード",
    selfMute:                  "マイクミュート",
    selfDeaf:                  "スピーカーミュート",
    selfVideo:                 "カメラ",
    streaming:                 "配信",
    serverMute:                "サーバーミュート",
    serverDeaf:                "サーバースピーカーミュート",
    suppress:                  "ステージ発言権",
    requestToSpeakTimestamp:   "発言リクエスト",
    channelId:                 "チャンネル",
    nickname:                  "ニックネーム",
    displayName:               "表示名",
    communicationDisabledUntil: "タイムアウト",
    color:                     "カラー",
    hoist:                     "別表示",
    mentionable:               "メンション可",
    permissions:               "権限",
  },
  en: {
    name:                      "Name",
    topic:                     "Topic",
    type:                      "Type",
    parentId:                  "Category",
    position:                  "Position",
    rateLimitPerUser:          "Slowmode",
    selfMute:                  "Mic mute",
    selfDeaf:                  "Deafen",
    selfVideo:                 "Camera",
    streaming:                 "Stream",
    serverMute:                "Server mute",
    serverDeaf:                "Server deafen",
    suppress:                  "Stage suppress",
    requestToSpeakTimestamp:   "Speak request",
    channelId:                 "Channel",
    nickname:                  "Nickname",
    displayName:               "Display name",
    communicationDisabledUntil: "Timeout",
    color:                     "Color",
    hoist:                     "Hoisted",
    mentionable:               "Mentionable",
    permissions:               "Permissions",
  },
};

function formatChangeValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v === "" ? "（空）" : v;
  return JSON.stringify(v);
}

function extractChanges(payload: unknown): Record<string, { before: unknown; after: unknown }> | null {
  if (!isObj(payload)) return null;
  const changes = payload["changes"];
  if (!isRecord(changes)) return null;
  const result: Record<string, { before: unknown; after: unknown }> = {};
  for (const [key, val] of Object.entries(changes)) {
    if (isRecord(val) && "before" in val && "after" in val) {
      result[key] = { before: val["before"], after: val["after"] };
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function extractContentField(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  // newContent/oldContent がある場合は diff 表示するので content 単体は使わない
  if ("oldContent" in payload || "newContent" in payload) return null;
  if (typeof payload["content"] === "string" && payload["content"] !== "") return payload["content"];
  return null;
}

function extractContentDiff(payload: unknown): { oldContent: string | null; newContent: string | null } | null {
  if (!isObj(payload)) return null;
  if (!("oldContent" in payload) && !("newContent" in payload)) return null;
  return {
    oldContent: typeof payload["oldContent"] === "string" ? payload["oldContent"] : null,
    newContent: typeof payload["newContent"] === "string" ? payload["newContent"] : null,
  };
}

function extractGenre(payload: unknown): string | null {
  if (!isObj(payload)) return null;
  return typeof payload["genre"] === "string" ? payload["genre"] : null;
}


export function LogsExplorer() {
  const [uiLang, setUiLang] = useState<GuildLanguage>("en");
  const loc = getDashboardLocale(uiLang);
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    logs,
    nextCursor,
    loading,
    loadingMore,
    error,
    accessRole,
    loadLogs,
    loadMore,
    appendRealtimeLog,
  } = useLogsData();

  const onRealtimeError = useCallback((message: string) => {
    console.error("Realtime logs error:", message);
  }, []);

  const realtimeStatus = useLogsRealtime(
    normalizeGuildId(appliedFilters.guildId),
    appendRealtimeLog,
    onRealtimeError
  );

  const realtimeMeta = getRealtimeStatusMeta(realtimeStatus);
  const canViewRaw = canViewRawLogPayload(accessRole);

  useEffect(() => {
    const stored = localStorage.getItem(UI_LANG_KEY);
    if (stored !== null && isGuildLanguage(stored)) setUiLang(stored);
    else setUiLang(detectBrowserLanguage());
  }, []);

  useEffect(() => {
    const storedGuildId = window.localStorage.getItem(dashboardGuildStorageKey);
    if (storedGuildId) {
      const next = { ...initialFilters, guildId: storedGuildId };
      setFilters(next);
      setAppliedFilters(next);
    }
  }, []);

  useEffect(() => {
    if (normalizeGuildId(appliedFilters.guildId)) {
      window.localStorage.setItem(dashboardGuildStorageKey, normalizeGuildId(appliedFilters.guildId));
      setExpandedId(null);
      void loadLogs(appliedFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const filtered = useMemo(() => logs.filter((log) => {
    if (appliedFilters.eventName && !log.eventName.startsWith(appliedFilters.eventName))
      return false;
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      const desc = formatEventDescription(log.eventName, {
        actorId: log.actorId,
        actorName: extractActorName(log.payload),
        channelId: log.channelId,
        channelName: log.channelName ?? extractChannelName(log.payload),
        action: extractAuditAction(log.payload),
        targetId: extractTargetId(log.payload),
        targetName: extractTargetName(log.payload),
        voiceStateChanges: extractVoiceStateChanges(log.payload),
      }, uiLang).toLowerCase();
      if (!desc.includes(q) && !log.eventName.includes(q)) return false;
    }
    return true;
  }), [logs, appliedFilters.eventName, appliedFilters.search]);

  function applyCategory(eventName: string) {
    const next = {
      ...appliedFilters,
      eventName,
      guildId: normalizeGuildId(appliedFilters.guildId),
    };
    setAppliedFilters(next);
    setFilters(next);
  }

  return (
    <div className="flex max-w-7xl flex-col gap-4">
      <LogsChart logs={logs} loc={loc} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {categoryTabs.map((tab) => (
            <button
              key={tab.eventName}
              onClick={() => applyCategory(tab.eventName)}
              type="button"
              className={
                appliedFilters.eventName === tab.eventName
                  ? "rounded-md border border-[#5865f2]/40 bg-[#5865f2]/10 px-3 py-1 text-xs font-medium text-[#c9cdfb]"
                  : "rounded-md border border-[#3f4147] px-3 py-1 text-xs font-medium text-[#b5bac1] hover:border-[#3f4147] hover:text-[#dbdee1]"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={loc.logsSearchPlaceholder}
            value={filters.search}
            onChange={(e) => {
              const v = e.target.value;
              setFilters((f) => ({ ...f, search: v }));
              setAppliedFilters((f) => ({ ...f, search: v }));
            }}
            className="w-48 rounded-md border border-[#3f4147] bg-[#383a40]/50 px-3 py-1.5 text-sm text-[#dbdee1] placeholder:text-[#80848e] focus:border-slate-500 focus:outline-none"
          />

          <div className="flex items-center gap-1.5">
            {realtimeStatus === "live" ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-[50%] bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-[50%] bg-[#5865f2]" />
                </span>
                <span className="text-xs text-[#c9cdfb]">{loc.logsLive}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-[50%] bg-[#4e5058]" />
                <span className="text-xs text-[#b5bac1]">{realtimeMeta.label}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="rounded-lg border border-[#1e1f22] bg-[#2b2d31] shadow-sm">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#80848e]">
            {loc.logsNoEventsDisplay}
          </div>
        ) : (
          <ul className="divide-y divide-[#1e1f22]/60">
            {filtered.map((log) => (
              <LogEntry
                key={log.id}
                log={log}
                isExpanded={expandedId === log.id}
                guildId={normalizeGuildId(appliedFilters.guildId) ?? undefined}
                canViewRaw={canViewRaw}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                loc={loc}
                lang={uiLang}
                payloadLabels={getPayloadLabels(loc)}
              />
            ))}
          </ul>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <button
            className="rounded-md border border-[#3f4147] px-4 py-2 text-sm text-[#b5bac1] hover:border-[#3f4147] hover:text-[#dbdee1] disabled:opacity-40"
            disabled={loadingMore}
            onClick={() => void loadMore(appliedFilters, nextCursor)}
            type="button"
          >
            {loadingMore ? loc.logsLoading : loc.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

function LogEntry({
  log,
  isExpanded,
  guildId,
  canViewRaw,
  onToggle,
  loc,
  lang,
  payloadLabels,
}: {
  log: LogItem;
  isExpanded: boolean;
  guildId: string | undefined;
  canViewRaw: boolean;
  onToggle: () => void;
  loc: ReturnType<typeof getDashboardLocale>;
  lang: "en" | "ja";
  payloadLabels: Record<string, string>;
}) {
  const color = getEventColor(log.eventName);
  const cls = eventColorClasses[color];
  const description = formatEventDescriptionJSX(log.eventName, {
    actorId: log.actorId,
    actorName: extractActorName(log.payload),
    channelId: log.channelId,
    channelName: log.channelName ?? extractChannelName(log.payload),
    action: extractAuditAction(log.payload),
    targetId: extractTargetId(log.payload),
    targetName: extractTargetName(log.payload),
    voiceStateChanges: extractVoiceStateChanges(log.payload),
    genre: extractGenre(log.payload),
  }, guildId, lang);
  const payload = isRecord(log.payload) ? log.payload : {};
  const content = extractContentField(log.payload);
  const contentDiff = extractContentDiff(log.payload);
  const changes = extractChanges(log.payload);
  const changeLabels = changeFieldLabels[lang];

  return (
    <li>
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#383a40]/40"
        onClick={onToggle}
        type="button"
      >
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-[50%] ${cls.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#dbdee1]">{description}</p>
          <p className="mt-0.5 text-xs text-[#80848e]">{log.eventName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-[#80848e]">
            {formatRelativeTime(new Date(log.receivedAt), lang)}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-[#80848e]" />
          ) : (
            <ChevronRight className="h-3 w-3 text-[#80848e]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#1e1f22]/60 bg-[#1e1f22]/50 px-4 py-3 space-y-3">
          {/* メッセージ内容（単体） */}
          {content && (
            <div>
              <p className="mb-1 text-xs text-[#80848e]">
                {lang === "ja" ? "メッセージ内容" : "Message content"}
              </p>
              <div className="rounded border border-[#3f4147] bg-[#383a40]/30 px-3 py-2 text-sm text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </div>
            </div>
          )}

          {/* メッセージ編集 diff（oldContent / newContent） */}
          {contentDiff && (
            <div>
              <p className="mb-1 text-xs text-[#80848e]">
                {lang === "ja" ? "メッセージ内容" : "Message content"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-xs text-[#f5a9a9]/70">
                    {lang === "ja" ? "変更前" : "Before"}
                  </p>
                  <div className="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-[#f5a9a9] whitespace-pre-wrap break-words leading-relaxed min-h-[2.5rem]">
                    {contentDiff.oldContent ?? <span className="text-[#80848e] italic">{lang === "ja" ? "（なし）" : "(none)"}</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#a9f5b8]/70">
                    {lang === "ja" ? "変更後" : "After"}
                  </p>
                  <div className="rounded border border-green-900/40 bg-green-950/20 px-3 py-2 text-sm text-[#a9f5b8] whitespace-pre-wrap break-words leading-relaxed min-h-[2.5rem]">
                    {contentDiff.newContent ?? <span className="text-[#80848e] italic">{lang === "ja" ? "（なし）" : "(none)"}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* メタ情報グリッド */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-[#80848e]">{loc.logsEventTime}</dt>
              <dd className="text-[#dbdee1]">
                {new Date(log.eventTimestamp).toLocaleString(loc.dateLocale)}
              </dd>
            </div>
            {log.actorId && (() => {
              const name = extractActorName(log.payload);
              return (
                <div>
                  <dt className="text-[#80848e]">{loc.actor}</dt>
                  <dd className="text-[#dbdee1]">
                    {name ? (
                      <>
                        <span>{name}</span>
                        <span className="ml-1 font-mono text-[#b5bac1]">({log.actorId})</span>
                      </>
                    ) : (
                      <span className="font-mono">{log.actorId}</span>
                    )}
                  </dd>
                </div>
              );
            })()}
            {log.channelId && (() => {
              const name = log.channelName ?? extractChannelName(log.payload);
              return (
                <div>
                  <dt className="text-[#80848e]">{loc.logsChannelLabel}</dt>
                  <dd className="text-[#dbdee1]">
                    {name ? (
                      <>
                        <span>#{name}</span>
                        <span className="ml-1 font-mono text-[#b5bac1]">({log.channelId})</span>
                      </>
                    ) : (
                      <span className="font-mono">{log.channelId}</span>
                    )}
                  </dd>
                </div>
              );
            })()}
            {Object.entries(payload)
              .filter(([k, v]) => k !== "content" && k !== "oldContent" && k !== "newContent" && v !== null && v !== undefined && v !== "" && typeof v !== "object")
              .slice(0, MAX_PAYLOAD_FIELDS_DISPLAYED)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[#80848e]">{payloadLabels[k] ?? k}</dt>
                  <dd className="text-[#dbdee1]">{formatPayloadFieldValue(k, v)}</dd>
                </div>
              ))}
          </dl>

          {/* フィールド変更テーブル（channel.update など） */}
          {changes && (
            <div>
              <p className="mb-1 text-xs text-[#80848e]">
                {lang === "ja" ? "変更内容" : "Changes"}
              </p>
              <div className="overflow-hidden rounded border border-[#3f4147]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#3f4147] bg-[#2b2d31]">
                      <th className="px-3 py-1.5 text-left font-medium text-[#80848e] w-1/4">
                        {lang === "ja" ? "項目" : "Field"}
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-[#80848e] w-[37.5%] border-l border-[#3f4147]">
                        {lang === "ja" ? "変更前" : "Before"}
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-[#80848e] w-[37.5%] border-l border-[#3f4147]">
                        {lang === "ja" ? "変更後" : "After"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(changes).map(([key, { before, after }]) => (
                      <tr key={key} className="border-b border-[#1e1f22]/60 last:border-0">
                        <td className="px-3 py-2 text-[#80848e]">
                          {changeLabels[key] ?? key}
                        </td>
                        <td className="px-3 py-2 font-mono text-[#f5a9a9] bg-red-950/20 border-l border-[#3f4147] break-all">
                          {formatChangeValue(before)}
                        </td>
                        <td className="px-3 py-2 font-mono text-[#a9f5b8] bg-green-950/20 border-l border-[#3f4147] break-all">
                          {formatChangeValue(after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {canViewRaw && (
            <details>
              <summary className="cursor-pointer text-xs text-[#80848e] hover:text-[#b5bac1]">
                RAW JSON
              </summary>
              <pre className="mt-1 max-h-64 overflow-auto rounded bg-[#2b2d31] p-2 text-xs text-[#b5bac1]">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
}
