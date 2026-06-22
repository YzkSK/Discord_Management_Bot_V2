export interface DiscordChannelResponse {
  id: string;
  name: string;
}

interface DiscordApiChannel {
  id: string;
  name: string;
}

const SNOWFLAKE_RE = /^\d{17,20}$/;

export async function fetchDiscordApiChannel(
  channelId: string,
  botToken: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch
): Promise<DiscordChannelResponse | null> {
  if (!SNOWFLAKE_RE.test(channelId)) return null;

  const response = await fetcher(
    `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}`,
    { headers: { Authorization: `Bot ${botToken}` }, signal: AbortSignal.timeout(5000) }
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Discord API returned ${response.status}`);

  const channel = (await response.json()) as DiscordApiChannel;
  return { id: channel.id, name: channel.name };
}
