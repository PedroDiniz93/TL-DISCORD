import { redirect } from "next/navigation";
import { buildDiscordLoginUrl } from "@/lib/discord";
import { createState, getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
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
