import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { buildDiscordLoginUrl } from "@/lib/discord";
import { createState, getSession } from "@/lib/session";
import { WEB_LOCALE_COOKIE, normalizeLocale, tr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(WEB_LOCALE_COOKIE)?.value);
  const missing = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DATABASE_URL"].filter(
    (name) => !process.env[name]
  );
  if (missing.length) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{tr(locale, "Configuração incompleta", "Incomplete configuration")}</CardTitle>
            <CardDescription>{tr(locale, "Configure as variáveis abaixo no serviço web do Railway.", "Configure the variables below in the Railway web service.")}</CardDescription>
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
          <CardTitle>{tr(locale, "Entrar com Discord", "Sign in with Discord")}</CardTitle>
          <CardDescription>{tr(locale, "Use uma conta com permissao de administrador na guild.", "Use an account with administrator permission in the guild.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href={url}>{tr(locale, "Continuar com Discord", "Continue with Discord")}</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
