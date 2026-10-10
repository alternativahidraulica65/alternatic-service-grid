import { useRouter, Link } from "@tanstack/react-router";
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
  Pin,
  PinOff,
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
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { NotificacoesSino } from "@/components/NotificacoesSino";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";



export function AppNavigation({ context, children }: { context: any; children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile, roles, isDiretor, isFinanceiro, isGestor, isOperador, isTerceirizado, homeDashboard, canSwitchView } = context;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isMenuPinned, setIsMenuPinned] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDesktopMenuOpen(false);
  }, [router.state.location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDesktopMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
    { label: "Ordens de Serviço", icon: ClipboardList, to: "/os", roles: ["diretor", "administrativo_financeiro", "gestor", "operador"] },
    { label: "Terceiros", icon: Package, to: "/terceiros", roles: ["diretor", "administrativo_financeiro", "gestor"] },
    { label: "Orquestrador", icon: Factory, to: "/producao/orquestrador", roles: ["diretor", "gestor"] },
    { label: "Produção (Kanban)", icon: LayoutDashboard, to: "/kanban", roles: ["diretor", "gestor", "operador"] },
    { label: "Lançamentos", icon: Receipt, to: "/financeiro/lancamentos", roles: ["diretor", "administrativo_financeiro"] },

    { label: "Materiais", icon: Factory, to: "/engenharia/materiais", roles: ["diretor", "gestor"] },
    { label: "Fornecedores", icon: Truck, to: "/financeiro/fornecedores", roles: ["diretor", "administrativo_financeiro"] },
    { label: "Vendedores", icon: Users, to: "/admin/vendedores", roles: ["diretor", "administrativo_financeiro"] },
    { label: "Configurações", icon: Settings, to: "/configuracoes", roles: ["diretor", "administrativo_financeiro"] },
    { label: "Checklists", icon: ClipboardCheck, to: "/admin/checklist-templates", roles: ["diretor", "gestor"] },
    { label: "Auditoria", icon: HistoryIcon, to: "/admin/auditoria", roles: ["diretor"] },
    { label: "Colaboradores", icon: Users, to: "/rh/colaboradores", roles: ["administrativo_financeiro"], exclusivo: true },
  ];

  const filteredMenu = menuItems.filter((item: any) =>
    item.exclusivo
      ? (roles as string[]).includes("administrativo_financeiro")
      : isDiretor || item.roles.some((role: string) => profile?.cargo === role || (roles as string[]).includes(role))
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
        <DropdownMenuContent align="end" className="w-56 bg-metal-dark text-destructive-foreground border-border/20">
          <DropdownMenuLabel className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            SIMULADOR RBAC
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-background/10" />
          {["diretor", "financeiro", "gestor", "operador"].map((view) => (
            <DropdownMenuItem 
              key={view}
              onClick={() => {
                router.navigate({ to: `/dashboard/${view}` as any });
              }}

              className={`capitalize ${activeView === view ? "bg-primary text-primary-foreground font-bold" : "hover:bg-background/10"}`}
            >
              Perfil {view}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className={`min-h-screen bg-background ${isMenuPinned ? "md:pl-64" : ""}`}>
      {/* Sidebar Desktop */}
      <aside
        id="desktop-navigation"
        aria-label="Menu principal"
        onMouseLeave={() => { if (!isMenuPinned) setIsDesktopMenuOpen(false); }}
        onBlur={(event) => {
          if (!isMenuPinned && !event.currentTarget.contains(event.relatedTarget)) setIsDesktopMenuOpen(false);
        }}
        className={`fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-metal-dark text-destructive-foreground shadow-xl md:flex ${isMenuPinned || isDesktopMenuOpen ? "visible" : "invisible pointer-events-none"}`}
      >
        <div className="p-6 border-b border-border/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Droplets className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xs font-black uppercase tracking-widest text-destructive-foreground leading-none">Alternativa</h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">Hidráulica</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-border/20 p-3">
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={isMenuPinned}
            onClick={() => { setIsMenuPinned(!isMenuPinned); setIsDesktopMenuOpen(true); }}
            className="min-w-0 flex-1 justify-start text-destructive-foreground hover:bg-primary hover:text-primary-foreground"
          >
            {isMenuPinned ? <PinOff className="mr-2 h-4 w-4 shrink-0" /> : <Pin className="mr-2 h-4 w-4 shrink-0" />}
            {isMenuPinned ? "Desafixar menu" : "Fixar menu"}
          </Button>
          {!isMenuPinned && <Button variant="ghost" size="icon" aria-label="Fechar menu" onClick={() => setIsDesktopMenuOpen(false)} className="shrink-0 text-destructive-foreground hover:bg-primary hover:text-primary-foreground"><X className="h-4 w-4" /></Button>}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenu.map((item) => (
            <Link
              key={item.to}
              to={item.to as any}
              activeProps={{ className: "bg-primary text-primary-foreground shadow-lg shadow-primary/10" }}
              inactiveProps={{ className: "text-metal-light hover:text-destructive-foreground hover:bg-background/10" }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border/20 bg-foreground/20">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="h-8 w-8 rounded-full bg-metal flex items-center justify-center text-[10px] font-bold border border-border/20 uppercase">
              {profile?.nome?.substring(0, 2) || "AD"}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold truncate text-destructive-foreground uppercase">{profile?.nome || "Admin"}</p>
              <p className="text-[9px] text-metal-light truncate uppercase font-medium">{activeView || "Usuário"}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full justify-start text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive/30 text-[10px] font-bold uppercase tracking-widest"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sair do Sistema
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-card px-4 shadow-sm md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost" size="icon" aria-label="Abrir menu"
              aria-controls="desktop-navigation" aria-expanded={isMenuPinned || isDesktopMenuOpen}
              onMouseEnter={() => setIsDesktopMenuOpen(true)}
              onClick={() => setIsDesktopMenuOpen(!isDesktopMenuOpen)}
              className="hidden shrink-0 md:inline-flex"
            ><Menu className="h-6 w-6" /></Button>
             {/* Mobile Menu Trigger */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="shrink-0 md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" aria-describedby={undefined} className="flex h-dvh w-[min(280px,85vw)] flex-col border-none bg-metal-dark p-0 text-destructive-foreground md:hidden">
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                 <div className="p-6 border-b border-border/20 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h1 className="font-display text-xs font-black uppercase tracking-widest">Alternativa</h1>
                </div>
                <nav className="min-h-0 flex-1 overflow-y-auto p-4 space-y-1">
                  {filteredMenu.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      onClick={() => setIsMobileMenuOpen(false)}
                      activeProps={{ className: "bg-primary text-primary-foreground" }}
                      inactiveProps={{ className: "text-metal-light hover:bg-background/10" }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                  <Button 
                    variant="ghost" 
                    onClick={handleSignOut}
                    className="w-full justify-start text-destructive-foreground mt-4 text-[10px] font-bold uppercase"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Sair
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-tighter">
              <Link to="/dashboard" className="hover:text-primary transition-colors">ERP</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate text-foreground">{activeView}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <NotificacoesSino />
            <div className="h-8 w-1px bg-border hidden sm:block" />
            <div className="hidden sm:flex items-center gap-3 ml-2">
              <div className="text-right">
                <p className="text-[10px] font-black text-foreground uppercase leading-none">{profile?.nome || profile?.email?.split('@')[0] || "Admin"}</p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-tighter mt-1">{profile?.cargo || roles?.[0] || "Acesso"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
