import { createFileRoute, Outlet, useRouter, Link, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { 
  LogOut, 
  Droplets, 
  LayoutDashboard,
  Factory,
  Wrench,
  DollarSign,
  Users,
  Search,
  Settings,
  ShieldCheck,
  Eye,
  Menu,
  X,
  Bell,
  ChevronRight,
  ClipboardList, 
  ClipboardCheck,
  FileText,
  Package,
  Receipt,
  Truck,
  History as HistoryIcon
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context, location }) => {
    const { homeDashboard, canSwitchView } = context as any;
    const home = homeDashboard || "operador";
    const path = location.pathname.replace(/\/+$/, "");

    // /dashboard -> painel do perfil
    if (path === "/dashboard") {
      throw redirect({ to: `/dashboard/${home}` as any, replace: true });
    }

    // Bloqueia acesso a painel de outro perfil (exceto diretor/dev)
    const view = path.split("/")[2] ?? "";
    const known = ["diretor", "financeiro", "gestor", "operador"];
    if (!canSwitchView && known.includes(view) && view !== home) {
      throw redirect({ to: `/dashboard/${home}` as any, replace: true });
    }
  },
  component: DashboardLayout,
});


function DashboardLayout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile, roles, isDiretor, isFinanceiro, isGestor, isOperador, isTerceirizado, homeDashboard, canSwitchView } = Route.useRouteContext() as any;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentPath = router.state.location.pathname;
  const activeView = currentPath.split("/")[2] || homeDashboard || "operador";


  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    await router.navigate({ to: "/", replace: true });
  }

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", roles: ["diretor", "administrativo_financeiro", "gestor", "operador"] },
    { label: "Clientes", icon: Users, to: "/clientes", roles: ["diretor", "administrativo_financeiro", "gestor"] },
    { label: "Nova OS / Triagem", icon: Wrench, to: "/os/nova", roles: ["diretor", "gestor", "operador"] },
    { label: "Produção (Kanban)", icon: LayoutDashboard, to: "/kanban", roles: ["diretor", "gestor", "operador"] },
    { label: "Materiais", icon: Factory, to: "/engenharia/materiais", roles: ["diretor", "gestor"] },
    { label: "Fornecedores", icon: Truck, to: "/financeiro/fornecedores", roles: ["diretor", "administrativo_financeiro"] },
    { label: "Vendedores", icon: Users, to: "/admin/vendedores", roles: ["diretor", "administrativo_financeiro"] },
    { label: "Usuários", icon: Users, to: "/admin/usuarios", roles: ["diretor"] },
    { label: "Checklists", icon: ClipboardCheck, to: "/admin/checklist-templates", roles: ["diretor", "gestor"] },
    { label: "Auditoria", icon: HistoryIcon, to: "/admin/auditoria", roles: ["diretor"] },
  ];

  const filteredMenu = menuItems.filter(item => 
    isDiretor || item.roles.some(role => profile?.cargo === role || (roles as string[]).includes(role))
  );

  const ViewSwitcher = () => {
    if (!canSwitchView) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/5 hidden md:flex">
            <Eye className="mr-2 h-4 w-4" />
            Visão: {activeView?.toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-slate-900 text-white border-white/10">
          <DropdownMenuLabel className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            SIMULADOR RBAC
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          {["diretor", "financeiro", "gestor", "operador"].map((view) => (
            <DropdownMenuItem 
              key={view}
              onClick={() => {
                router.navigate({ to: `/dashboard/${view}` as any });
              }}

              className={`capitalize ${activeView === view ? "bg-primary text-primary-foreground font-bold" : "hover:bg-white/10"}`}
            >
              Perfil {view}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-white sticky top-0 h-screen border-r border-white/5 shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            <Droplets className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xs font-black uppercase tracking-widest text-white leading-none">Alternativa</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Hidráulica</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenu.map((item) => (
            <Link
              key={item.to}
              to={item.to as any}
              activeProps={{ className: "bg-primary text-primary-foreground shadow-lg shadow-primary/10" }}
              inactiveProps={{ className: "text-slate-400 hover:text-white hover:bg-white/5" }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-slate-950/30">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-white/10 uppercase">
              {profile?.nome?.substring(0, 2) || "AD"}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold truncate text-white uppercase">{profile?.nome || "Admin"}</p>
              <p className="text-[9px] text-slate-500 truncate uppercase font-medium">{activeView || "Usuário"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sair do Sistema
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 shadow-sm">
          <div className="flex items-center gap-4">
             {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-slate-900 p-0 border-none text-white">
                 <div className="p-6 border-b border-white/5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xs font-black uppercase tracking-widest">Alternativa</h1>
                </div>
                <nav className="p-4 space-y-1">
                  {filteredMenu.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      onClick={() => setIsMobileMenuOpen(false)}
                      activeProps={{ className: "bg-primary text-primary-foreground" }}
                      inactiveProps={{ className: "text-slate-400 hover:bg-white/5" }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                  <Button 
                    variant="ghost" 
                    onClick={handleSignOut}
                    className="w-full justify-start text-red-400 mt-4 text-[10px] font-bold uppercase"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sair
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-tighter">
              <Link to="/dashboard" className="hover:text-primary transition-colors">ERP</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{activeView}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-primary transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>
            <div className="h-8 w-1px bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-3 ml-2">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{profile?.nome || profile?.email?.split('@')[0] || "Admin"}</p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-tighter mt-1">{profile?.cargo || roles?.[0] || "Acesso"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
