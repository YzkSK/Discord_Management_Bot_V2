import type { JWT } from "next-auth/jwt";

const discordTokenUrl = "https://discord.com/api/v10/oauth2/token";
const accessTokenRefreshSkewMs = 60_000;

type DiscordTokenFetch = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

export interface DashboardDiscordToken {
  discordAccessToken?: string;
  discordAccessTokenExpiresAt?: number;
  discordRefreshToken?: string;
}

export interface RefreshDiscordAccessTokenInput {
  clientId: string;
  clientSecret: string;
  fetcher?: DiscordTokenFetch | undefined;
  now?: number;
  refreshToken: string;
}

export interface GetUsableDiscordAccessTokenInput {
  clientId: string;
  clientSecret: string;
  fetcher?: DiscordTokenFetch | undefined;
  now?: number;
  token: DashboardDiscordToken;
}

type UsableDiscordAccessTokenResult =
  | {
      accessToken: string;
      ok: true;
    }
  | {
      error: string;
      ok: false;
    };

interface DiscordTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export function getDiscordTokenExpiry(
  expiresAtSeconds: number | undefined,
  expiresInSeconds: number | undefined,
  now = Date.now()
) {
  if (expiresAtSeconds) {
    return expiresAtSeconds * 1_000;
  }

  if (expiresInSeconds) {
    return now + expiresInSeconds * 1_000;
  }

  return undefined;
}

export function isDiscordAccessTokenUsable(
  token: DashboardDiscordToken,
  now = Date.now()
) {
  if (!token.discordAccessToken) return false;
  if (!token.discordAccessTokenExpiresAt) return true;
  return token.discordAccessTokenExpiresAt - accessTokenRefreshSkewMs > now;
}

export async function refreshDiscordAccessToken(
  input: RefreshDiscordAccessTokenInput
): Promise<Required<DashboardDiscordToken>> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
    refresh_token: input.refreshToken
  });

  const response = await (input.fetcher ?? fetch)(discordTokenUrl, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Discord access token (${response.status}).`);
  }

  const refreshed = (await response.json()) as DiscordTokenResponse;
  const now = input.now ?? Date.now();

  return {
    discordAccessToken: refreshed.access_token,
    discordAccessTokenExpiresAt: now + refreshed.expires_in * 1_000,
    discordRefreshToken: refreshed.refresh_token ?? input.refreshToken
  };
}

export async function getUsableDiscordAccessToken(
  input: GetUsableDiscordAccessTokenInput
): Promise<UsableDiscordAccessTokenResult> {
  if (isDiscordAccessTokenUsable(input.token, input.now)) {
    return {
      accessToken: input.token.discordAccessToken!,
      ok: true
    };
  }

  if (!input.token.discordRefreshToken) {
    return {
      error: "Authentication expired.",
      ok: false
    };
  }

  try {
    const refreshInput: RefreshDiscordAccessTokenInput = {
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      refreshToken: input.token.discordRefreshToken
    };
    if (input.fetcher) refreshInput.fetcher = input.fetcher;
    if (input.now !== undefined) refreshInput.now = input.now;

    const refreshed = await refreshDiscordAccessToken(refreshInput);

    return {
      accessToken: refreshed.discordAccessToken,
      ok: true
    };
  } catch {
    return {
      error: "Authentication expired.",
      ok: false
    };
  }
}

export function toDashboardDiscordToken(token: JWT): DashboardDiscordToken {
  const dashboardToken: DashboardDiscordToken = {};

  if (typeof token.discordAccessToken === "string") {
    dashboardToken.discordAccessToken = token.discordAccessToken;
  }

  if (typeof token.discordAccessTokenExpiresAt === "number") {
    dashboardToken.discordAccessTokenExpiresAt = token.discordAccessTokenExpiresAt;
  }

  if (typeof token.discordRefreshToken === "string") {
    dashboardToken.discordRefreshToken = token.discordRefreshToken;
  }

  return dashboardToken;
}
