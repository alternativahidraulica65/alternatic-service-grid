import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context, location }) => {
    const { homeDashboard, canSwitchView } = context as any;
    const home = homeDashboard || "operador";
    const path = location.pathname.replace(/\/+$/, "");

    // Bloqueia acesso a painel de outro perfil (exceto diretor/dev)
    const view = path.split("/")[2] ?? "";
    const known = ["diretor", "financeiro", "gestor", "operador"];
    if (!canSwitchView && known.includes(view) && view !== home) {
      throw redirect({ to: `/dashboard/${home}` as any, replace: true });
    }
  },
  component: Outlet,
});

