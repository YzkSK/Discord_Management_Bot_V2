import {
  realtimeDefaultDisabledEvents,
  realtimeDefaultEnabledEvents
} from "@discord-bot/shared";

const realtimeEnabledEventSet = new Set<string>(realtimeDefaultEnabledEvents);
const realtimeDisabledEventSet = new Set<string>(realtimeDefaultDisabledEvents);

export interface ResolveRealtimeEnabledOptions {
  override?: boolean;
}

export function resolveRealtimeEnabled(
  eventName: string,
  options: ResolveRealtimeEnabledOptions = {}
): boolean {
  if (typeof options.override === "boolean") {
    return options.override;
  }

  if (realtimeEnabledEventSet.has(eventName)) {
    return true;
  }

  if (realtimeDisabledEventSet.has(eventName)) {
    return false;
  }

  return false;
}
