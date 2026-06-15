import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ComponentType, MessageFlags } from "discord.js";

import {
  createComponentsV2TextMessage,
  discordTimestamp,
  discordRelative,
  EVENT_COLORS,
} from "./components-v2.js";

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

  it("sets accent_color on container when accentColor is provided", () => {
    const message = createComponentsV2TextMessage({
      title: "test",
      accentColor: 0x9B59B6,
    });
    const container = message.components?.[0] as unknown as Record<string, unknown>;
    assert.equal(container?.accent_color, 0x9B59B6);
  });

  it("does not include accent_color when accentColor is omitted", () => {
    const message = createComponentsV2TextMessage({ title: "test" });
    const container = message.components?.[0] as unknown as Record<string, unknown>;
    assert.equal(container?.accent_color, undefined);
  });
});

describe("createComponentsV2TextMessage with mediaUrls", () => {
  it("appends a MediaGallery component when mediaUrls are provided", () => {
    const url = "https://cdn.discordapp.com/attachments/1/2/image.png";
    const message = createComponentsV2TextMessage({
      title: "Test",
      lines: ["line 1"],
      mediaUrls: [url]
    });

    const container = message.components?.[0] as unknown as Record<string, unknown>;
    const components = container.components as unknown[];
    assert.equal(components.length, 3); // title TextDisplay + line TextDisplay + MediaGallery
    const gallery = components[2] as Record<string, unknown>;
    assert.equal(gallery.type, 12);
    assert.deepEqual(gallery.items, [{ media: { url } }]);
  });

  it("caps MediaGallery at 10 items when more than 10 URLs are given", () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://cdn.discordapp.com/img${i}.png`);
    const message = createComponentsV2TextMessage({ title: "Test", mediaUrls: urls });

    const container = message.components?.[0] as unknown as Record<string, unknown>;
    const components = container.components as unknown[];
    const gallery = components[1] as Record<string, unknown>;
    const items = gallery.items as unknown[];
    assert.equal(items.length, 10);
  });

  it("does not add a MediaGallery when mediaUrls is empty", () => {
    const message = createComponentsV2TextMessage({ title: "Test", lines: ["x"], mediaUrls: [] });

    const container = message.components?.[0] as unknown as Record<string, unknown>;
    const components = container.components as unknown[];
    assert.equal(components.length, 2); // title + line only, no gallery
  });
});

describe("discordTimestamp", () => {
  it("returns Discord formatted timestamp", () => {
    const d = new Date("2026-06-11T12:00:00Z");
    assert.equal(discordTimestamp(d), `<t:${Math.floor(d.getTime() / 1000)}:f>`);
  });
});

describe("discordRelative", () => {
  it("returns Discord relative timestamp", () => {
    const d = new Date("2026-06-11T12:00:00Z");
    assert.equal(discordRelative(d), `<t:${Math.floor(d.getTime() / 1000)}:R>`);
  });
});

describe("EVENT_COLORS", () => {
  it("exports expected color constants", () => {
    assert.equal(EVENT_COLORS.green, 0x57F287);
    assert.equal(EVENT_COLORS.red, 0xED4245);
    assert.equal(EVENT_COLORS.purple, 0x9B59B6);
  });
});
