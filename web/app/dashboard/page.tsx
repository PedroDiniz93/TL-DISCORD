import Link from "next/link";
import { redirect } from "next/navigation";
import { Server } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Servidores administrados</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha uma guild para configurar o bot, gerenciar itens e acompanhar filas.
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
                  <CardDescription>{guild.owner ? "Dono" : "Administrador"}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Abrir painel da guild</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
