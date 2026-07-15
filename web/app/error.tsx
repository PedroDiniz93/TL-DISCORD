"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const isEnglish = typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("en");
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{isEnglish ? "Error loading panel" : "Erro ao carregar o painel"}</CardTitle>
          <CardDescription>
            {isEnglish
              ? "Check the web service variables and whether migrations were applied to PostgreSQL."
              : "Verifique as variáveis do serviço web e se as migrações foram aplicadas no PostgreSQL."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {error.message}
          </pre>
          <Button onClick={reset}>{isEnglish ? "Try again" : "Tentar novamente"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
