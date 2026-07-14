import Link from "next/link";
import { Download } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getPanelData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveriesCard, GuildHeader, QueuesCard, Stats } from "@/components/guild/guild-ui";

export default async function GuildPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { sessionGuild } = await requireGuildAccess(guildId);

  const botGuild = await fetchBotGuild(guildId);
  if (!botGuild) {
    return (
      <div className="space-y-6">
        <GuildHeader title={sessionGuild.name} description="O bot ainda nao esta instalado neste servidor." />
        <Card>
          <CardHeader><CardTitle>Convidar bot</CardTitle><CardDescription>Convide o bot antes de configurar canais, cargos, itens e filas.</CardDescription></CardHeader>
          <CardContent><Button asChild><a href={buildBotInviteUrl(guildId)}>Convidar para {sessionGuild.name}</a></Button></CardContent>
        </Card>
      </div>
    );
  }

  const panelData = await getPanelData(guildId);
  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <GuildHeader title={sessionGuild.name} description="Visao geral operacional da guild." />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild><Link href={`/guild/${guildId}/export/wishlist.csv`}><Download className="h-4 w-4" />Exportar filas</Link></Button>
            <Button variant="outline" asChild><Link href={`/guild/${guildId}/export/deliveries.csv`}><Download className="h-4 w-4" />Exportar entregas</Link></Button>
          </div>
        </div>
      </div>
      <Stats counts={panelData.counts} queues={panelData.queues.length} />
      <div className="grid gap-6 lg:grid-cols-2">
        <QueuesCard queues={panelData.queues} />
        <DeliveriesCard deliveries={panelData.deliveries} />
      </div>
    </div>
  );
}
