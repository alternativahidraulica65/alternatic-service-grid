import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: ({ context }) => {
    const home = (context as any)?.homeDashboard || "operador";

    if (home === "diretor") throw redirect({ to: "/dashboard/diretor", replace: true });
    if (home === "financeiro") throw redirect({ to: "/dashboard/financeiro", replace: true });
    if (home === "gestor") throw redirect({ to: "/dashboard/gestor", replace: true });
    throw redirect({ to: "/dashboard/operador", replace: true });
  },
  component: () => null,
});
