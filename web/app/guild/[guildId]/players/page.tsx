import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getGuildPlayers, getGuildSettings } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildHeader } from "@/components/guild/guild-ui";
import { PlayerGrid } from "@/components/guild/player-ui";

export default async function GuildPlayersPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { sessionGuild } = await requireGuildAccess(guildId);
  const settings = await getGuildSettings(guildId);
  const locale = settings.locale;

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <GuildHeader title={sessionGuild.name} description={tr(locale, "O bot ainda nao esta instalado neste servidor.", "The bot is not installed on this server yet.")} locale={locale} />
        <Card>
          <CardHeader>
            <CardTitle>{tr(locale, "Convidar bot", "Invite bot")}</CardTitle>
            <CardDescription>{tr(locale, "Convide o bot antes de visualizar jogadores.", "Invite the bot before viewing players.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>{tr(locale, "Convidar para", "Invite to")} {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const players = await getGuildPlayers(guildId);

  return (
    <div className="space-y-8">
      <GuildHeader title={sessionGuild.name} description={tr(locale, "Jogadores com lista ativa ou historico de recebimento.", "Players with an active list or delivery history.")} locale={locale} />
      <PlayerGrid players={players} locale={locale} />
    </div>
  );
}
