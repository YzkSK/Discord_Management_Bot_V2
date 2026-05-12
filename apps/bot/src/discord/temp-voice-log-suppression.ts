export const tempVoiceCreateReason = "Temp VC created from creation channel.";
export const tempVoiceControlCreateReason = "Temp VC control channel created.";
export const tempVoiceDeleteReason = "Temp VC empty.";

const tempVoiceAuditReasons = new Set([
  tempVoiceCreateReason,
  tempVoiceControlCreateReason,
  tempVoiceDeleteReason
]);

export function isTempVoiceAuditReason(reason: string | null | undefined) {
  return reason ? tempVoiceAuditReasons.has(reason) : false;
}
