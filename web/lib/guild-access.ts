import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function requireGuildAccess(guildId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sessionGuild = session.guilds.find((guild) => guild.id === guildId);
  if (!sessionGuild) redirect("/dashboard");

  return { session, sessionGuild };
}
