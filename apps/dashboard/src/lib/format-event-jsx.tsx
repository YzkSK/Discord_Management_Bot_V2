import type { ReactNode } from "react";
import {
  formatEventDescription,
  getActorText,
  splitDescriptionOnActor,
  type EventVars,
} from "./event-display";
import { UserMention } from "../components/user-mention";

export function formatEventDescriptionJSX(
  eventName: string,
  vars: EventVars
): ReactNode {
  const description = formatEventDescription(eventName, vars);
  const mentionText = getActorText(vars);
  if (!mentionText || !vars.actorId) return description;

  const parts = splitDescriptionOnActor(description, mentionText);
  if (!parts) return description;

  return (
    <>
      {parts.before}
      <UserMention
        userId={vars.actorId}
        actorName={vars.actorName ?? vars.actorId}
      />
      {parts.after}
    </>
  );
}
