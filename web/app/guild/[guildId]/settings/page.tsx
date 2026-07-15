import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild, fetchGuildChannels, fetchGuildRoles, getGuildBotStatus } from "@/lib/discord";
import { getGuildSettings, getPanelData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildAdministrationCard, GuildHeader, SettingsCard, SubscriptionCard } from "@/components/guild/guild-ui";

export default async function GuildSettingsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { sessionGuild } = await requireGuildAccess(guildId);

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <GuildHeader title={sessionGuild.name} description="O bot ainda nao esta instalado neste servidor." />
        <Card>
          <CardHeader>
            <CardTitle>Convidar bot</CardTitle>
            <CardDescription>Convide o bot antes de configurar canais e cargos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>Convidar para {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [channels, roles, settings, panelData] = await Promise.all([
    fetchGuildChannels(guildId),
    fetchGuildRoles(guildId),
    getGuildSettings(guildId),
    getPanelData(guildId),
  ]);
  const botStatus = await getGuildBotStatus(guildId, settings.allowedChannelId);

  return (
    <div className="space-y-8">
      <GuildHeader title={sessionGuild.name} description="Configuracao do bot e status comercial da guild." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <GuildAdministrationCard guildId={guildId} status={botStatus} />
          <SettingsCard guildId={guildId} channels={channels} roles={roles} settings={settings} />
        </div>
        <SubscriptionCard subscription={panelData.subscription} />
      </div>
    </div>
  );
}
