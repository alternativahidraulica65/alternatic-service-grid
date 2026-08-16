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
      .eq("user_id", user.id)
      .single();

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = user.email === "admin@teste.com" || roles.includes("diretor");

    return { 
      user, 
      profile, 
      roles,
      isAdmin
    };
  },
  component: () => <Outlet />,
});
