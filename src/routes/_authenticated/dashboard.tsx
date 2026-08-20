import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const router = useRouter();
  const { isDiretor, isFinanceiro, isGestor, isOperador, isTerceirizado } = Route.useRouteContext();

  useEffect(() => {
    if (router.state.location.pathname !== "/dashboard") return;

    let target = "operador";
    if (isDiretor) target = "diretor";
    else if (isFinanceiro) target = "financeiro";
    else if (isGestor) target = "gestor";
    else if (isOperador) target = "operador";
    else if (isTerceirizado) target = "terceirizado";

    router.navigate({ to: `/dashboard/${target}` as any, replace: true });
  }, [isDiretor, isFinanceiro, isGestor, isOperador, isTerceirizado, router]);

  return <Outlet />;
}
