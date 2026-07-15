import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Server } from "lucide-react";
import { getSession } from "@/lib/session";
import { WEB_LOCALE_COOKIE, normalizeLocale, tr } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(WEB_LOCALE_COOKIE)?.value);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr(locale, "Servidores administrados", "Managed servers")}</h1>
        <p className="mt-1 text-muted-foreground">
          {tr(locale, "Escolha uma guild para configurar o bot, gerenciar itens e acompanhar filas.", "Choose a guild to configure the bot, manage items, and track queues.")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {session.guilds.map((guild) => (
          <Link key={guild.id} href={`/guild/${guild.id}`}>
            <Card className="transition hover:border-primary">
              <CardHeader className="flex flex-row items-center gap-3">
                <Server className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{guild.name}</CardTitle>
                  <CardDescription>{guild.owner ? tr(locale, "Dono", "Owner") : tr(locale, "Administrador", "Administrator")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{tr(locale, "Abrir painel da guild", "Open guild panel")}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
