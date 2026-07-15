import Link from "next/link";
import { Download } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getGuildSettings, getPanelData } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildHeader, Stats } from "@/components/guild/guild-ui";
import { QueueGrid } from "@/components/guild/queue-ui";

export default async function GuildQueuesPage({ params }: { params: Promise<{ guildId: string }> }) {
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
            <CardDescription>{tr(locale, "Convide o bot antes de visualizar as filas.", "Invite the bot before viewing queues.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>{tr(locale, "Convidar para", "Invite to")} {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const panelData = await getPanelData(guildId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <GuildHeader title={sessionGuild.name} description={tr(locale, "Filas de desejo agrupadas por item.", "Wishlists grouped by item.")} locale={locale} />
        <Button variant="outline" asChild>
          <Link href={`/guild/${guildId}/export/wishlist.csv`}><Download className="h-4 w-4" />{tr(locale, "Exportar filas", "Export queues")}</Link>
        </Button>
      </div>
      <Stats counts={panelData.counts} queues={panelData.queues.length} locale={locale} />
      <QueueGrid guildId={guildId} queues={panelData.queues} locale={locale} />
    </div>
  );
}
