import { createFileRoute } from "@tanstack/react-router";
import { 
  Bell, 
  Search, 
  Trash2, 
  Check, 
  Filter, 
  Clock, 
  AlertCircle,
  Settings,
  Plus
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"todas" | "enviado" | "lido">("todas");
  const [search, setSearch] = useState("");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notificacoes-full", filter, search],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("notificacoes")
        .select("*")
        .eq("usuario_id", user.id)
        .order("data_envio", { ascending: false });

      if (filter !== "todas") {
        query = query.eq("status_envio", filter);
      }
      
      if (search) {
        query = query.ilike("mensagem_enviada", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ status_envio: "lido" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes-full"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes-full"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Notificação removida");
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from("notificacoes")
        .update({ status_envio: "lido" })
        .eq("usuario_id", user.id)
        .eq("status_envio", "enviado");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes-full"] });
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas marcadas como lidas");
    },
  });

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
            <Bell className="h-3 w-3" />
            Comunicação / Central
          </h2>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            Minhas Notificações
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-slate-200 shadow-sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={notifications.filter(n => n.status_envio !== 'lido').length === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
          <Link to="/admin/alertas">
            <Button className="h-11 px-6 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200">
              <Settings className="mr-2 h-4 w-4" />
              Configurar Alertas
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filtros */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Filter className="h-3 w-3" /> Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {[
                { label: "Todas", value: "todas" },
                { label: "Pendentes", value: "enviado" },
                { label: "Lidas", value: "lido" }
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value as any)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    filter === item.value 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="py-4 px-6 border-b bg-slate-50/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Search className="h-3 w-3" /> Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Input 
                placeholder="Pesquisar mensagem..." 
                className="text-xs font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Lista de Notificações */}
        <div className="lg:col-span-3">
          <Card className="border-border shadow-lg">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carregando...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                  <Bell className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Nenhuma notificação encontrada</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">Tente ajustar seus filtros ou busca.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "p-6 transition-all hover:bg-slate-50 group relative flex gap-6",
                        notification.status_envio !== "lido" ? "bg-primary/5" : ""
                      )}
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        notification.status_envio !== "lido" ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-400"
                      )}>
                        <Bell className="h-6 w-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {notification.titulo_enviado || "Notificação do Sistema"}
                          </h3>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                              <Clock className="h-3 w-3" />
                              {format(new Date(notification.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            {notification.status_envio !== "lido" && (
                              <Badge className="bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest px-2">Nova</Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 max-w-2xl">
                          {notification.mensagem_enviada}
                        </p>
                        
                        <div className="flex items-center gap-3">
                          {notification.status_envio !== "lido" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                              onClick={() => markAsRead.mutate(notification.id)}
                            >
                              <Check className="mr-2 h-3 w-3" /> Marcar como lida
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => deleteNotification.mutate(notification.id)}
                          >
                            <Trash2 className="mr-2 h-3 w-3" /> Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}