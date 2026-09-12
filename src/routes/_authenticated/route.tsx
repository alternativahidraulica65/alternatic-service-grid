import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Não redireciona aqui: o redirect antes da hidratação quebra a tela.
      // O AuthGate abaixo cuida disso já no cliente.
      return {
        user: null,
        profile: null,
        roles: [] as string[],
        homeDashboard: "operador" as const,
        canSwitchView: false,
        isDiretor: false,
        isFinanceiro: false,
        isGestor: false,
        isOperador: false,
        isTerceirizado: false,
        isAdmin: false,
      };
    }


    // Fetch user profile and role using auth.uid() which is user.id
    const { data: profile } = await supabase
      .from("usuarios")
      .select("*")
      .eq("user_id", user.id)
      .single();
    
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = userRoles?.map(r => r.role) || [];
    
    // RBAC Logic: Identifica o perfil principal e permissões
    const isDiretor = roles.includes("diretor");
    const isFinanceiro = roles.includes("administrativo_financeiro");
    const isGestor = roles.includes("gestor");
    const isOperador = roles.includes("operador");
    const isTerceirizado = roles.includes("terceirizado");

    // Usuário DEV sempre tem acesso total (tratado como Diretor)
    const isDev = user.email === "dev@admin.com" || user.email === "teste.dev@alternativahidraulica.local" || user.email === "admin@teste.com";
    // Financeiro/Administrativo tem acesso irrestrito, igual ao Diretor.
    const hasFullAccess = isDiretor || isDev || isFinanceiro;

    // Dashboard inicial de acordo com o perfil real do usuário
    const cargo = (profile as any)?.cargo as string | undefined;
    const has = (r: string) => roles.includes(r as any) || cargo === r;

    let homeDashboard: "diretor" | "financeiro" | "gestor" | "operador" = "operador";
    if (has("administrativo_financeiro")) homeDashboard = "financeiro";
    else if (hasFullAccess || has("diretor")) homeDashboard = "diretor";
    else if (has("gestor")) homeDashboard = "gestor";
    else homeDashboard = "operador";

    return { 
      user, 
      profile, 
      roles,
      homeDashboard,
      canSwitchView: hasFullAccess,
      isDiretor: hasFullAccess,
      isFinanceiro: isFinanceiro || hasFullAccess,
      isGestor: isGestor || hasFullAccess,
      isOperador: isOperador || hasFullAccess,
      isTerceirizado: isTerceirizado || hasFullAccess,
      isAdmin: hasFullAccess
    };

  },
  component: AuthGate,
});

function AuthGate() {
  const { user } = Route.useRouteContext() as any;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/", replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs font-bold uppercase tracking-widest">
        Verificando acesso...
      </div>
    );
  }

  return <Outlet />;
}
