import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "TLGM Bot",
  description: "Painel multi-guild do TLGM Bot",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-border bg-[#101823] text-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/dashboard" className="text-lg font-extrabold">
              TLGM Bot
            </Link>
            <nav className="flex items-center gap-3 text-sm text-slate-200">
              {session ? (
                <>
                  <span>{session.user.global_name || session.user.username}</span>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/logout">Sair</Link>
                  </Button>
                </>
              ) : null}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
