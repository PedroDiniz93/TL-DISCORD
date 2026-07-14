import { redirect } from "next/navigation";
import { buildDiscordLoginUrl } from "@/lib/discord";
import { createState, getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const missing = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DATABASE_URL"].filter(
    (name) => !process.env[name]
  );
  if (missing.length) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Configuração incompleta</CardTitle>
            <CardDescription>Configure as variáveis abaixo no serviço web do Railway.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {missing.map((name) => (
                <li key={name}>
                  <code>{name}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }
  const url = buildDiscordLoginUrl(createState());
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar com Discord</CardTitle>
          <CardDescription>Use uma conta com permissao de administrador na guild.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href={url}>Continuar com Discord</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
