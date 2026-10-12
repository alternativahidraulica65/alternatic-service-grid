import { createFileRoute, redirect } from "@tanstack/react-router";

// Rota legada desativada: redireciona para o módulo oficial com dados reais.
export const Route = createFileRoute("/_authenticated/orcamento")({
  beforeLoad: () => {
    throw redirect({ to: "/os", replace: true });
  },
});
