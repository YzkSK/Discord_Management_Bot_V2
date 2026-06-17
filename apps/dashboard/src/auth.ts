import { parseDashboardAuthEnv } from "@discord-bot/config";
import { createDbConnection, insertLogEvent } from "@discord-bot/db";
import type { AuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import DiscordProvider from "next-auth/providers/discord";

import {
  getDiscordTokenExpiry,
  refreshDiscordAccessToken,
  toDashboardDiscordToken,
  isDiscordAccessTokenUsable
} from "./auth-token";

let _authOptions: AuthOptions | undefined;

export function getAuthOptions(): AuthOptions {
  if (_authOptions) return _authOptions;

  const env = parseDashboardAuthEnv();

  _authOptions = {
    ...(env.NEXTAUTH_SECRET ? { secret: env.NEXTAUTH_SECRET } : {}),
    pages: {
      signIn: "/login"
    },
    providers: [
      DiscordProvider({
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        authorization: {
          params: {
            scope: "identify guilds"
          }
        }
      })
    ],
    session: {
      strategy: "jwt"
    },
    events: {
      async signIn({ user }) {
        if (!user.id) return;
        const db = createDbConnection();
        const now = new Date();
        void insertLogEvent(db.db, {
          eventName: "dashboard.login",
          guildId: null,
          actorId: user.id,
          channelId: null,
          messageId: null,
          eventTimestamp: now,
          receivedAt: now,
          payload: {}
        }).catch(() => {/* best-effort */}).finally(() => void db.close());
      },
      async signOut({ token }) {
        const userId = (token as JWT | null)?.sub;
        if (!userId) return;
        const db = createDbConnection();
        const now = new Date();
        void insertLogEvent(db.db, {
          eventName: "dashboard.logout",
          guildId: null,
          actorId: userId,
          channelId: null,
          messageId: null,
          eventTimestamp: now,
          receivedAt: now,
          payload: {}
        }).catch(() => {/* best-effort */}).finally(() => void db.close());
      }
    },
    callbacks: {
      async jwt({ account, token }) {
        if (account?.access_token) {
          token.discordAccessToken = account.access_token;
          const expiresAt = getDiscordTokenExpiry(
            typeof account.expires_at === "number" ? account.expires_at : undefined,
            typeof account.expires_in === "number" ? account.expires_in : undefined
          );
          if (expiresAt !== undefined) {
            token.discordAccessTokenExpiresAt = expiresAt;
          } else {
            delete token.discordAccessTokenExpiresAt;
          }
        }

        if (account?.refresh_token) {
          token.discordRefreshToken = account.refresh_token;
          delete token.discordTokenError;
        }

        if (isDiscordAccessTokenUsable(toDashboardDiscordToken(token))) {
          return token;
        }

        if (typeof token.discordRefreshToken === "string") {
          try {
            const refreshed = await refreshDiscordAccessToken({
              clientId: env.DISCORD_CLIENT_ID,
              clientSecret: env.DISCORD_CLIENT_SECRET,
              refreshToken: token.discordRefreshToken
            });
            token.discordAccessToken = refreshed.discordAccessToken;
            token.discordAccessTokenExpiresAt = refreshed.discordAccessTokenExpiresAt;
            token.discordRefreshToken = refreshed.discordRefreshToken;
            delete token.discordTokenError;
          } catch {
            delete token.discordAccessToken;
            delete token.discordAccessTokenExpiresAt;
            token.discordTokenError = "RefreshAccessTokenError";
          }
        }

        return token;
      },
      session({ session, token }) {
        return withDiscordUserId(session, token);
      }
    }
  };

  return _authOptions;
}

export function getDashboardSession() {
  return getServerSession(getAuthOptions());
}

export function withDiscordUserId(session: Session, token: JWT) {
  if (session.user && token.sub) {
    session.user.id = token.sub;
  }

  return session;
}
