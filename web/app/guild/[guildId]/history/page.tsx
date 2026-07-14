import Link from "next/link";
import { Download } from "lucide-react";
import { requireGuildAccess } from "@/lib/guild-access";
import { buildBotInviteUrl, fetchBotGuild } from "@/lib/discord";
import { getPanelData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveriesCard, GuildHeader } from "@/components/guild/guild-ui";

export default async function GuildHistoryPage({ params }: { params: Promise<{ guildId: string }> }) {
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
            <CardDescription>Convide o bot antes de visualizar o historico.</CardDescription>
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
        <GuildHeader title={sessionGuild.name} description="Historico das ultimas entregas feitas pelos administradores." />
        <Button variant="outline" asChild>
          <Link href={`/guild/${guildId}/export/deliveries.csv`}><Download className="h-4 w-4" />Exportar entregas</Link>
        </Button>
      </div>
      <DeliveriesCard deliveries={panelData.deliveries} />
    </div>
  );
}
