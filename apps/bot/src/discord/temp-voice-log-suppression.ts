export const tempVoiceCreateReason = "Temp VC created from creation channel.";
export const tempVoiceControlCreateReason = "Temp VC control channel created.";
export const tempVoiceDeleteReason = "Temp VC empty.";

const defaultSuppressionTtlMs = 30_000;
const tempVoiceAuditReasons = new Set([
  tempVoiceCreateReason,
  tempVoiceControlCreateReason,
  tempVoiceDeleteReason
]);
const suppressedChannelLogs = new Map<string, number>();

export function isTempVoiceAuditReason(reason: string | null | undefined) {
  return reason ? tempVoiceAuditReasons.has(reason) : false;
}

export function suppressTempVoiceChannelLog(
  channelId: string,
  ttlMs = defaultSuppressionTtlMs
) {
  suppressedChannelLogs.set(channelId, Date.now() + ttlMs);
}

export function shouldSuppressTempVoiceChannelLog(channelId: string) {
  const expiresAt = suppressedChannelLogs.get(channelId);

  if (!expiresAt) {
    return false;
  }

  if (Date.now() > expiresAt) {
    suppressedChannelLogs.delete(channelId);
    return false;
  }

  suppressedChannelLogs.delete(channelId);
  return true;
}
