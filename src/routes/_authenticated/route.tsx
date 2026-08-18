import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw redirect({ to: "/" });
    }

    // Fetch user profile and role
    const { data: profile } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
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
    const isDev = user.email === "dev@admin.com";
    const hasFullAccess = isDiretor || isDev;

    return { 
      user, 
      profile, 
      roles,
      isDiretor: hasFullAccess,
      isFinanceiro: isFinanceiro || hasFullAccess,
      isGestor: isGestor || hasFullAccess,
      isOperador: isOperador || hasFullAccess,
      isTerceirizado: isTerceirizado || hasFullAccess,
      isAdmin: hasFullAccess
    };
  },
  component: () => <Outlet />,
});
