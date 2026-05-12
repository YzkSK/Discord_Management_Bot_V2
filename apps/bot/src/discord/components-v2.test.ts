import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ComponentType, MessageFlags } from "discord.js";

import { createComponentsV2TextMessage } from "./components-v2.js";

describe("createComponentsV2TextMessage", () => {
  it("creates a Components V2 container message", () => {
    const message = createComponentsV2TextMessage({
      title: "Temp VC Control",
      lines: ["Owner: <@123>"]
    });

    assert.equal(message.flags, MessageFlags.IsComponentsV2);
    assert.deepEqual(message.components, [
      {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: "## Temp VC Control"
          },
          {
            type: ComponentType.TextDisplay,
            content: "Owner: <@123>"
          }
        ]
      }
    ]);
  });

  it("can mark interaction replies as ephemeral", () => {
    const message = createComponentsV2TextMessage({
      title: "Setup complete",
      privateResponse: true
    });

    assert.equal(
      message.flags,
      MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    );
  });
});
