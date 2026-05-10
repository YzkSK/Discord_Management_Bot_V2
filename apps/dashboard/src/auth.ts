import { parseDashboardAuthEnv } from "@discord-bot/config";
import type { AuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import DiscordProvider from "next-auth/providers/discord";

const env = parseDashboardAuthEnv();

export const authOptions: AuthOptions = {
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
  callbacks: {
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      return withDiscordUserId(session, token);
    }
  }
};

export function getDashboardSession() {
  return getServerSession(authOptions);
}

export function withDiscordUserId(session: Session, token: JWT) {
  if (session.user && token.sub) {
    session.user.id = token.sub;
  }

  return session;
}
