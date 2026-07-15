import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Bot, LayoutDashboard, LogOut, ServerCog } from "lucide-react";
import "./globals.css";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { WEB_LOCALE_COOKIE, normalizeLocale, tr } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "TLGM Bot",
  description: "Painel multi-guild do TLGM Bot",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(WEB_LOCALE_COOKIE)?.value);
  return (
    <html lang={locale}>
      <body>
        <div className="min-h-screen bg-background">
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-[#101823] text-white lg:block">
            <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="font-extrabold leading-tight">TLGM Bot</div>
                <div className="text-xs text-slate-400">{tr(locale, "Operacoes de guild", "Guild operations")}</div>
              </div>
            </div>
            <nav className="space-y-6 px-3 py-5">
              <SidebarGroup label={tr(locale, "Principal", "Main")}>
                <SidebarLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</SidebarLink>
              </SidebarGroup>
              <div className="rounded-md border border-white/10 px-3 py-3 text-xs leading-5 text-slate-400">
                {tr(locale, "Abra uma guild no dashboard para acessar configuracao, catalogo, filas e historico em paginas separadas.", "Open a guild from the dashboard to access settings, catalog, queues, and history on separate pages.")}
              </div>
            </nav>
            {session ? (
              <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
                <div className="mb-3 truncate text-sm font-semibold">{session.user.global_name || session.user.username}</div>
                <Button asChild variant="secondary" size="sm" className="w-full">
                  <Link href="/logout"><LogOut className="h-4 w-4" /> {tr(locale, "Sair", "Log out")}</Link>
                </Button>
              </div>
            ) : null}
          </aside>
          <div className="lg:pl-72">
            <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex h-16 items-center justify-between px-5 lg:px-8">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold lg:hidden">
                  <ServerCog className="h-5 w-5 text-primary" />
                  TLGM Bot
                </Link>
                <div className="hidden text-sm text-muted-foreground lg:block">{tr(locale, "Painel administrativo", "Admin panel")}</div>
                {session ? (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="hidden text-muted-foreground sm:inline">{session.user.global_name || session.user.username}</span>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/logout">{tr(locale, "Sair", "Log out")}</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </header>
            <main className="px-5 py-6 lg:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

function SidebarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SidebarLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
      {icon}
      {children}
    </Link>
  );
}
