import type { ReactNode } from "react";
import {
  formatEventDescription,
  getActorText,
  getChannelText,
  splitDescriptionOnActor,
  type EventVars,
} from "./event-display";
import { UserMention } from "../components/user-mention";
import { ChannelMention } from "../components/channel-mention";

export function formatEventDescriptionJSX(
  eventName: string,
  vars: EventVars
): ReactNode {
  const description = formatEventDescription(eventName, vars);
  const actorText = getActorText(vars);
  const channelText = getChannelText(vars);

  let before: string = "";
  let actorNode: ReactNode = null;
  let middle: string = description;
  let channelNode: ReactNode = null;
  let after: string = "";

  if (actorText && vars.actorId) {
    const actorParts = splitDescriptionOnActor(description, actorText);
    if (actorParts) {
      before = actorParts.before;
      actorNode = (
        <UserMention
          userId={vars.actorId}
          actorName={vars.actorName ?? null}
        />
      );
      middle = actorParts.after;
    }
  }

  if (channelText && vars.channelId) {
    const chParts = splitDescriptionOnActor(middle, channelText);
    if (chParts) {
      after = chParts.after;
      channelNode = (
        <ChannelMention
          channelId={vars.channelId}
          channelName={vars.channelName ?? null}
        />
      );
      middle = chParts.before;
    }
  }

  if (!actorNode && !channelNode) return description;

  return (
    <>
      {before}
      {actorNode && <>{" "}{actorNode}{" "}</>}
      {middle}
      {channelNode && <>{" "}{channelNode}{" "}</>}
      {after}
    </>
  );
}
