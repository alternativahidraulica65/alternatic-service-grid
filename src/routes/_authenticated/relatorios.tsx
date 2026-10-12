import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada desativada: redireciona para o módulo oficial com dados reais.
export const Route = createFileRoute("/_authenticated/relatorios")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", replace: true });
  },
});
