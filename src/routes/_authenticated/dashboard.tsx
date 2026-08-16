import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Wrench } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Alternativa Hidráulica" },
      { name: "description", content: "Dashboard operacional do ERP Alternativa Hidráulica." },
      { property: "og:title", content: "Dashboard — Alternativa Hidráulica" },
      { property: "og:description", content: "Dashboard operacional do ERP Alternativa Hidráulica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu do sistema");
    await router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">
                Alternativa Hidráulica
              </h1>
              <p className="text-xs text-muted-foreground">ERP Industrial</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="rounded-lg border-input"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container-industrial py-10">
        <div className="card-industrial max-w-3xl">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Dashboard
          </h2>
          <p className="mt-2 text-muted-foreground">
            Bem-vindo ao sistema ERP da Alternativa Hidráulica. O ambiente de gestão de ordens de serviço será disponibilizado nas próximas etapas.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuário</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{user.email}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{user.id}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
