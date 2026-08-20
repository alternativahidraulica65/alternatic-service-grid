import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Info, AlertTriangle, XCircle, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("usuario_id", user.id)
        .order("data_envio", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const unreadCount = notifications.filter(n => n.status_envio !== "lido").length;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notificacoes_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
          // toast.info("Nova notificação recebida");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notificacoes")
        .update({ status_envio: "lido" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
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
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      toast.success("Todas as notificações marcadas como lidas");
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
      queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    },
  });

  const getIcon = (alertaId: string | null) => {
    // Ideally we'd join with alertas table or store type in metadata
    // For now using a generic bell or checking metadata if we add it
    return <Bell className="h-4 w-4 text-primary" />;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-primary transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-slate-900 border-white/10 shadow-2xl" align="end">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <Bell className="h-3 w-3 text-primary" />
            Notificações
          </h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[9px] uppercase tracking-widest text-primary hover:bg-white/5"
              onClick={() => markAllAsRead.mutate()}
            >
              Limpar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-slate-600" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "p-4 transition-colors hover:bg-white/5 group relative",
                    notification.status_envio !== "lido" ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {getIcon(notification.alerta_id)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white leading-tight mb-1 uppercase tracking-tighter">
                        {notification.titulo_enviado || "Alerta do Sistema"}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug mb-2">
                        {notification.mensagem_enviada}
                      </p>
                      <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">
                        {format(new Date(notification.data_envio), "dd MMM, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {notification.status_envio !== "lido" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-primary"
                        onClick={() => markAsRead.mutate(notification.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-red-400"
                      onClick={() => deleteNotification.mutate(notification.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-3 border-t border-white/5 bg-slate-950/30">
          <Link
            to="/dashboard" // We will create a full list page later, linking to dashboard for now
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            <Button variant="outline" size="sm" className="w-full border-white/10 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5">
              Ver todas as notificações
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}