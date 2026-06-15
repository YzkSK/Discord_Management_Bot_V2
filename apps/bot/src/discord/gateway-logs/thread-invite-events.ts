import { AuditLogEvent, Events, type Client } from "discord.js";
import { getInviteGuild, writeWithAuditLog } from "../audit-log.js";
import {
  createInviteEvent,
  createThreadEvent,
  diffRecord,
  threadPayload,
  type WriteEventFn
} from "./payloads.js";

export function installThreadGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.ThreadCreate, (thread, newlyCreated) => {
    writeWithAuditLog(
      write,
      createThreadEvent("thread.create", thread, { thread: threadPayload(thread), newlyCreated }),
      thread.guild,
      AuditLogEvent.ThreadCreate,
      thread.id
    );
  });

  client.on(Events.ThreadUpdate, (oldThread, newThread) => {
    writeWithAuditLog(
      write,
      createThreadEvent("thread.update", newThread, {
        before: threadPayload(oldThread),
        after: threadPayload(newThread),
        changes: diffRecord(threadPayload(oldThread), threadPayload(newThread))
      }),
      newThread.guild,
      AuditLogEvent.ThreadUpdate,
      newThread.id
    );
  });

  client.on(Events.ThreadDelete, (thread) => {
    writeWithAuditLog(
      write,
      createThreadEvent("thread.delete", thread, { thread: threadPayload(thread) }),
      thread.guild,
      AuditLogEvent.ThreadDelete,
      thread.id
    );
  });
}

export function installInviteGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.InviteCreate, (invite) => {
    writeWithAuditLog(
      write,
      createInviteEvent("invite.create", invite),
      getInviteGuild(invite),
      AuditLogEvent.InviteCreate,
      invite.code
    );
  });

  client.on(Events.InviteDelete, (invite) => {
    writeWithAuditLog(
      write,
      createInviteEvent("invite.delete", invite),
      getInviteGuild(invite),
      AuditLogEvent.InviteDelete,
      invite.code
    );
  });
}
