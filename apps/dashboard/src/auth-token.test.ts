import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getUsableDiscordAccessToken,
  isDiscordAccessTokenUsable,
  refreshDiscordAccessToken,
  type DashboardDiscordToken
} from "./auth-token.js";

describe("dashboard Discord OAuth token handling", () => {
  it("treats an expired access token as unusable", () => {
    const token: DashboardDiscordToken = {
      discordAccessToken: "expired",
      discordAccessTokenExpiresAt: Date.now() - 1_000,
      discordRefreshToken: "refresh"
    };

    assert.equal(isDiscordAccessTokenUsable(token), false);
  });

  it("refreshes an expired access token", async () => {
    const requests: Array<{ url: string; body: string }> = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      requests.push({ url, body: init?.body?.toString() ?? "" });
      return new Response(
        JSON.stringify({
          access_token: "new-access",
          expires_in: 3600,
          refresh_token: "new-refresh"
        }),
        { status: 200 }
      );
    };

    const refreshed = await refreshDiscordAccessToken({
      clientId: "client",
      clientSecret: "secret",
      fetcher,
      now: 1_000,
      refreshToken: "old-refresh"
    });

    assert.equal(refreshed.discordAccessToken, "new-access");
    assert.equal(refreshed.discordRefreshToken, "new-refresh");
    assert.equal(refreshed.discordAccessTokenExpiresAt, 3_601_000);
    assert.equal(requests[0]?.url, "https://discord.com/api/v10/oauth2/token");
    assert.match(requests[0]?.body ?? "", /grant_type=refresh_token/);
    assert.match(requests[0]?.body ?? "", /refresh_token=old-refresh/);
  });

  it("uses refresh token when the stored access token is expired", async () => {
    const token: DashboardDiscordToken = {
      discordAccessToken: "expired",
      discordAccessTokenExpiresAt: 1_000,
      discordRefreshToken: "refresh"
    };

    const result = await getUsableDiscordAccessToken({
      clientId: "client",
      clientSecret: "secret",
      fetcher: async () =>
        new Response(
          JSON.stringify({
            access_token: "fresh",
            expires_in: 60
          }),
          { status: 200 }
        ),
      now: 10_000,
      token
    });

    assert.equal(result.ok, true);
    assert.equal(result.ok ? result.accessToken : null, "fresh");
  });
});
