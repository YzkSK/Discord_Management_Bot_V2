import {
  Events,
  type AutoModerationActionExecution,
  type AutoModerationRule,
  type Client
} from "discord.js";
import { diffRecord, createGuildEvent, type WriteEventFn } from "./payloads.js";

function autoModRulePayload(rule: AutoModerationRule) {
  return {
    id: rule.id,
    name: rule.name,
    creatorId: rule.creatorId,
    eventType: rule.eventType,
    triggerType: rule.triggerType,
    triggerMetadata: rule.triggerMetadata,
    actions: rule.actions.map((a) => ({ type: a.type, metadata: a.metadata })),
    enabled: rule.enabled,
    exemptRoles: [...rule.exemptRoles.keys()],
    exemptChannels: [...rule.exemptChannels.keys()]
  };
}

function autoModActionPayload(execution: AutoModerationActionExecution) {
  return {
    ruleId: execution.ruleId,
    ruleTriggerType: execution.ruleTriggerType,
    userId: execution.userId,
    channelId: execution.channelId,
    messageId: execution.messageId,
    alertSystemMessageId: execution.alertSystemMessageId,
    content: execution.content,
    matchedKeyword: execution.matchedKeyword,
    matchedContent: execution.matchedContent,
    action: { type: execution.action.type, metadata: execution.action.metadata }
  };
}

export function installAutoModGatewayLogHandlers(client: Client, write: WriteEventFn) {
  client.on(Events.AutoModerationRuleCreate, (rule) => {
    write(
      createGuildEvent("automod.rule.create", rule.guild, {
        rule: autoModRulePayload(rule)
      }, rule.creatorId)
    );
  });

  client.on(Events.AutoModerationRuleUpdate, (oldRule, newRule) => {
    const before = oldRule ? autoModRulePayload(oldRule) : null;
    const after = autoModRulePayload(newRule);
    write(
      createGuildEvent("automod.rule.update", newRule.guild, {
        before,
        after,
        changes: before ? diffRecord(before, after) : {}
      })
    );
  });

  client.on(Events.AutoModerationRuleDelete, (rule) => {
    write(
      createGuildEvent("automod.rule.delete", rule.guild, {
        rule: autoModRulePayload(rule)
      })
    );
  });

  client.on(Events.AutoModerationActionExecution, (execution) => {
    write(
      createGuildEvent("automod.action", execution.guild, {
        action: autoModActionPayload(execution)
      }, execution.userId)
    );
  });
}
