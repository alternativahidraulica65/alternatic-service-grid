import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
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
