import Link from "next/link";
import { Download } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getPanelData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuildHeader, Stats } from "@/components/guild/guild-ui";
import { QueueGrid } from "@/components/guild/queue-ui";

export default async function GuildQueuesPage({ params }: { params: Promise<{ guildId: string }> }) {
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
            <CardDescription>Convide o bot antes de visualizar as filas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href={buildBotInviteUrl(guildId)}>Convidar para {sessionGuild.name}</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const panelData = await getPanelData(guildId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <GuildHeader title={sessionGuild.name} description="Filas de desejo agrupadas por item." />
        <Button variant="outline" asChild>
          <Link href={`/guild/${guildId}/export/wishlist.csv`}><Download className="h-4 w-4" />Exportar filas</Link>
        </Button>
      </div>
      <Stats counts={panelData.counts} queues={panelData.queues.length} />
      <QueueGrid guildId={guildId} queues={panelData.queues} />
    </div>
  );
}
