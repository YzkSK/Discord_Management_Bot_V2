import { AuditLogEvent, Events, type Client } from "discord.js";
import { writeWithAuditLog } from "../audit-log.js";
import {
  createGuildEvent,
  diffRecord,
  rolePayload,
  type WriteEventFn
} from "./payloads.js";

export function installRoleGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.GuildRoleCreate, (role) => {
    writeWithAuditLog(
      write,
      createGuildEvent("role.create", role.guild, { role: rolePayload(role) }),
      role.guild,
      AuditLogEvent.RoleCreate,
      role.id
    );
  });

  client.on(Events.GuildRoleUpdate, (oldRole, newRole) => {
    writeWithAuditLog(
      write,
      createGuildEvent("role.update", newRole.guild, {
        before: rolePayload(oldRole),
        after: rolePayload(newRole),
        changes: diffRecord(rolePayload(oldRole), rolePayload(newRole))
      }),
      newRole.guild,
      AuditLogEvent.RoleUpdate,
      newRole.id
    );
  });

  client.on(Events.GuildRoleDelete, (role) => {
    writeWithAuditLog(
      write,
      createGuildEvent("role.delete", role.guild, { role: rolePayload(role) }),
      role.guild,
      AuditLogEvent.RoleDelete,
      role.id
    );
  });
}
