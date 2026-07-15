import Link from "next/link";
import { Download } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getGuildSettings, getPanelData } from "@/lib/data";
import { tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveriesCard, GuildHeader, QueuesCard, Stats } from "@/components/guild/guild-ui";

export default async function GuildPage({ params }: { params: Promise<{ guildId: string }> }) {
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
          <CardHeader><CardTitle>{tr(locale, "Convidar bot", "Invite bot")}</CardTitle><CardDescription>{tr(locale, "Convide o bot antes de configurar canais, cargos, itens e filas.", "Invite the bot before configuring channels, roles, items, and queues.")}</CardDescription></CardHeader>
          <CardContent><Button asChild><a href={buildBotInviteUrl(guildId)}>{tr(locale, "Convidar para", "Invite to")} {sessionGuild.name}</a></Button></CardContent>
        </Card>
      </div>
    );
  }

  const panelData = await getPanelData(guildId);
  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <GuildHeader title={sessionGuild.name} description={tr(locale, "Visao geral operacional da guild.", "Operational guild overview.")} locale={locale} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild><Link href={`/guild/${guildId}/export/wishlist.csv`}><Download className="h-4 w-4" />{tr(locale, "Exportar filas", "Export queues")}</Link></Button>
            <Button variant="outline" asChild><Link href={`/guild/${guildId}/export/deliveries.csv`}><Download className="h-4 w-4" />{tr(locale, "Exportar entregas", "Export deliveries")}</Link></Button>
          </div>
        </div>
      </div>
      <Stats counts={panelData.counts} queues={panelData.queues.length} locale={locale} />
      <div className="grid gap-6 lg:grid-cols-2">
        <QueuesCard queues={panelData.queues} locale={locale} />
        <DeliveriesCard deliveries={panelData.deliveries} locale={locale} />
      </div>
    </div>
  );
}
