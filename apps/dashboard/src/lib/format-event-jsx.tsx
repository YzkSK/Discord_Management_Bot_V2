import type { ReactNode } from "react";
import {
  formatEventDescription,
  getActorText,
  getChannelText,
  getTargetText,
  splitDescriptionOnActor,
  type EventVars,
} from "./event-display";
import { UserMention } from "../components/user-mention";
import { ChannelMention } from "../components/channel-mention";

export function formatEventDescriptionJSX(
  eventName: string,
  vars: EventVars,
  guildId?: string
): ReactNode {
  const description = formatEventDescription(eventName, vars);
  const actorText = getActorText(vars);
  const targetText = getTargetText(vars);
  const channelText = getChannelText(vars);

  let before: string = "";
  let actorNode: ReactNode = null;
  let afterActor: string = description;
  let beforeTarget: string = "";
  let targetNode: ReactNode = null;
  let afterTarget: string = "";
  let channelNode: ReactNode = null;
  let afterChannel: string = "";

  if (actorText && vars.actorId) {
    const parts = splitDescriptionOnActor(description, actorText);
    if (parts) {
      before = parts.before;
      actorNode = (
        <UserMention
          userId={vars.actorId}
          actorName={vars.actorName ?? null}
        />
      );
      afterActor = parts.after;
    }
  }

  if (targetText && vars.targetId) {
    const parts = splitDescriptionOnActor(afterActor, targetText);
    if (parts) {
      beforeTarget = parts.before;
      targetNode = (
        <UserMention
          userId={vars.targetId}
          actorName={vars.targetName ?? null}
        />
      );
      afterTarget = parts.after;
    } else {
      afterTarget = afterActor;
    }
  } else {
    afterTarget = afterActor;
  }

  if (channelText && vars.channelId) {
    const parts = splitDescriptionOnActor(afterTarget, channelText);
    if (parts) {
      channelNode = (
        <ChannelMention
          channelId={vars.channelId}
          channelName={vars.channelName ?? null}
          {...(guildId !== undefined ? { guildId } : {})}
        />
      );
      afterChannel = parts.after;
      afterTarget = parts.before;
    } else {
      afterChannel = afterTarget;
      afterTarget = "";
    }
  } else {
    afterChannel = afterTarget;
    afterTarget = "";
  }

  if (!actorNode && !targetNode && !channelNode) return description;

  return (
    <>
      {before}
      {actorNode && <>{" "}{actorNode}{" "}</>}
      {beforeTarget}
      {targetNode && <>{" "}{targetNode}{" "}</>}
      {channelNode ? (
        <>
          {afterTarget}
          {" "}{channelNode}{" "}
          {afterChannel}
        </>
      ) : (
        afterChannel
      )}
    </>
  );
}
