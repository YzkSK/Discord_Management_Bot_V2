export interface DiscordChannelResponse {
  id: string;
  name: string;
}

interface DiscordApiChannel {
  id: string;
  name: string;
}

export async function fetchDiscordApiChannel(
  channelId: string,
  botToken: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch
): Promise<DiscordChannelResponse | null> {
  const response = await fetcher(
    `https://discord.com/api/v10/channels/${channelId}`,
    { headers: { Authorization: `Bot ${botToken}` } }
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Discord API returned ${response.status}`);

  const channel = (await response.json()) as DiscordApiChannel;
  return { id: channel.id, name: channel.name };
}
