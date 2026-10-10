import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [
    { title: "Meu painel — Alternativa Hidráulica" },
    { name: "description", content: "Acesso ao painel de trabalho conforme o perfil do usuário." },
    { property: "og:title", content: "Meu painel — Alternativa Hidráulica" },
    { property: "og:description", content: "Acesso ao painel de trabalho conforme o perfil do usuário." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const context = Route.useRouteContext() as any;
  const navigate = useNavigate();
  const home = context?.homeDashboard || "operador";

  useEffect(() => {
    const destinos = {
      diretor: "/dashboard/diretor",
      financeiro: "/dashboard/financeiro",
      gestor: "/dashboard/gestor",
      operador: "/dashboard/operador",
    } as const;
    const destino = destinos[home as keyof typeof destinos] ?? "/dashboard/operador";
    navigate({ to: destino, replace: true });
  }, [home, navigate]);

  return (
    <div className="p-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">
      Carregando painel...
    </div>
  );
}
