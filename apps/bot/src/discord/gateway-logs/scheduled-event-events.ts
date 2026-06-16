import {
  Events,
  type Client,
  type GuildScheduledEvent,
  type PartialGuildScheduledEvent,
  type User
} from "discord.js";
import { diffRecord, createGuildEvent, userPayload, type WriteEventFn } from "./payloads.js";

function scheduledEventPayload(event: GuildScheduledEvent | PartialGuildScheduledEvent) {
  return {
    id: event.id,
    name: event.name,
    description: event.description,
    channelId: event.channelId,
    creatorId: event.creatorId,
    entityType: event.entityType,
    entityId: event.entityId,
    entityMetadata: event.entityMetadata,
    privacyLevel: event.privacyLevel,
    status: event.status,
    scheduledStartTimestamp: event.scheduledStartTimestamp,
    scheduledEndTimestamp: event.scheduledEndTimestamp,
    userCount: event.userCount
  };
}

export function installScheduledEventGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.GuildScheduledEventCreate, (event) => {
    write(
      createGuildEvent("event.create", event.guild, {
        event: scheduledEventPayload(event)
      }, event.creatorId)
    );
  });

  client.on(Events.GuildScheduledEventUpdate, (oldEvent, newEvent) => {
    const before = oldEvent ? scheduledEventPayload(oldEvent) : null;
    const after = scheduledEventPayload(newEvent);
    write(
      createGuildEvent("event.update", newEvent.guild, {
        before,
        after,
        changes: before ? diffRecord(before, after) : {}
      })
    );
  });

  client.on(Events.GuildScheduledEventDelete, (event) => {
    write(
      createGuildEvent("event.delete", event.guild, {
        event: scheduledEventPayload(event)
      })
    );
  });

  client.on(Events.GuildScheduledEventUserAdd, (event, user) => {
    write(
      createGuildEvent("event.user.add", event.guild, {
        eventId: event.id,
        user: userPayload(user as User)
      }, (user as User).id)
    );
  });

  client.on(Events.GuildScheduledEventUserRemove, (event, user) => {
    write(
      createGuildEvent("event.user.remove", event.guild, {
        eventId: event.id,
        user: userPayload(user as User)
      }, (user as User).id)
    );
  });
}
