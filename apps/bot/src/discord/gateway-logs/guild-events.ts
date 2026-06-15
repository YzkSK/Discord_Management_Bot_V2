import { AuditLogEvent, Events, type Client, type GuildMember, type PartialGuildMember } from "discord.js";
import { applyAuditLog, lookupAuditLog, writeWithAuditLog } from "../audit-log.js";
import {
  createGuildEvent,
  diffRecord,
  guildPayload,
  memberPayload,
  userPayload,
  type WriteEventFn
} from "./payloads.js";

export function installGuildGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.GuildUpdate, (oldGuild, newGuild) => {
    writeWithAuditLog(
      write,
      createGuildEvent("guild.update", newGuild, {
        before: guildPayload(oldGuild),
        after: guildPayload(newGuild),
        changes: diffRecord(guildPayload(oldGuild), guildPayload(newGuild))
      }),
      newGuild,
      AuditLogEvent.GuildUpdate,
      newGuild.id
    );
  });

  client.on(Events.GuildMemberAdd, (member) => {
    write(
      createGuildEvent("member.join", member.guild, {
        member: memberPayload(member)
      }, member.id)
    );
  });

  client.on(Events.GuildMemberRemove, (member) => {
    void writeMemberRemoveEvent(write, member);
  });

  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? null;
    const newTimeout = newMember.communicationDisabledUntilTimestamp ?? null;
    const eventName = oldTimeout !== newTimeout ? "member.timeout" : "member.update";

    writeWithAuditLog(
      write,
      createGuildEvent(eventName, newMember.guild, {
        before: memberPayload(oldMember),
        after: memberPayload(newMember),
        changes: diffRecord(memberPayload(oldMember), memberPayload(newMember))
      }, newMember.id),
      newMember.guild,
      AuditLogEvent.MemberUpdate,
      newMember.id
    );
  });

  client.on(Events.GuildBanAdd, (ban) => {
    writeWithAuditLog(
      write,
      createGuildEvent("member.ban", ban.guild, {
        user: userPayload(ban.user),
        reason: ban.reason
      }, ban.user.id),
      ban.guild,
      AuditLogEvent.MemberBanAdd,
      ban.user.id
    );
  });

  client.on(Events.GuildBanRemove, (ban) => {
    writeWithAuditLog(
      write,
      createGuildEvent("member.unban", ban.guild, {
        user: userPayload(ban.user),
        reason: ban.reason
      }, ban.user.id),
      ban.guild,
      AuditLogEvent.MemberBanRemove,
      ban.user.id
    );
  });
}

async function writeMemberRemoveEvent(
  write: WriteEventFn,
  member: GuildMember | PartialGuildMember
) {
  const auditLog = await lookupAuditLog(
    member.guild,
    AuditLogEvent.MemberKick,
    member.id
  );
  const eventName = auditLog.status === "matched" ? "member.kick" : "member.leave";
  const event = createGuildEvent(eventName, member.guild, {
    member: memberPayload(member)
  }, auditLog.actorId ?? member.id);

  write(applyAuditLog(event, auditLog));
}
