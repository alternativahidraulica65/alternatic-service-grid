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
  Plus,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  User,
  Users,
  Database,
  Zap
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/alertas")({
  component: AdminAlertasPage,
});

function AdminAlertasPage() {
  const queryClient = useQueryClient();
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["admin-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .order("data_criacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["usuarios-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const createAlert = useMutation({
    mutationFn: async (newAlert: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("alertas")
        .insert([{ ...newAlert, criado_por: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alertas"] });
      toast.success("Alerta configurado com sucesso");
      setIsNewDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao criar alerta: " + error.message);
    }
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, ativo }: { id: string, ativo: boolean }) => {
      const { error } = await supabase
        .from("alertas")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alertas"] });
      toast.success("Status do alerta atualizado");
    }
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-alertas"] });
      toast.success("Alerta removido");
    }
  });

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "urgente": return <Badge className="bg-red-500 hover:bg-red-600 text-[9px] font-black uppercase tracking-widest">Urgente</Badge>;
      case "erro": return <Badge className="bg-orange-500 hover:bg-orange-600 text-[9px] font-black uppercase tracking-widest">Erro</Badge>;
      case "aviso": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 text-[9px] font-black uppercase tracking-widest">Aviso</Badge>;
      default: return <Badge className="bg-blue-500 hover:bg-blue-600 text-[9px] font-black uppercase tracking-widest">Informativo</Badge>;
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
            <Settings className="h-3 w-3" />
            Admin / Automação
          </h2>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            Gestão de Alertas
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 px-6 font-bold uppercase text-[10px] tracking-widest border-slate-200 shadow-sm" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 px-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" />
                Novo Alerta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-900 text-white border-white/10">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  titulo: formData.get('titulo'),
                  mensagem: formData.get('mensagem'),
                  tipo: formData.get('tipo'),
                  canais_notificacao: ['app_interno'], // Default for now
                  destinatarios: users.map(u => u.id), // All users for now
                  condicao_disparo: {
                    tabela: 'ordens_servico',
                    campo: 'status',
                    operador: 'igual',
                    valor: formData.get('valor_condicao')
                  },
                  ativo: true
                };
                createAlert.mutate(data);
              }}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase tracking-tighter text-primary">Configurar Novo Alerta Automático</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Defina as condições de disparo e a mensagem que será enviada aos usuários.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="titulo" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título do Alerta</Label>
                      <Input id="titulo" name="titulo" required className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nível de Criticidade</Label>
                      <Select name="tipo" defaultValue="informativo">
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 text-white border-white/10">
                          <SelectItem value="informativo">Informativo</SelectItem>
                          <SelectItem value="aviso">Aviso</SelectItem>
                          <SelectItem value="erro">Erro</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mensagem" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mensagem</Label>
                    <Textarea id="mensagem" name="mensagem" required className="bg-white/5 border-white/10 text-white min-h-[100px]" />
                  </div>

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Condição de Disparo (Trigger)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase text-slate-500">Quando a tabela</Label>
                        <Input value="Ordens de Serviço" disabled className="bg-white/5 border-white/10 text-slate-500 h-8 text-[10px]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase text-slate-500">O campo Status mudar para</Label>
                        <Select name="valor_condicao" defaultValue="concluido">
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 text-white border-white/10">
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_diagnostico">Em Diagnóstico</SelectItem>
                            <SelectItem value="aguardando_gestor">Aguardando Gestor</SelectItem>
                            <SelectItem value="aprovado">Aprovado</SelectItem>
                            <SelectItem value="execucao">Em Execução</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsNewDialogOpen(false)} className="text-white hover:bg-white/5 font-bold uppercase text-[10px]">Cancelar</Button>
                  <Button type="submit" disabled={createAlert.isPending} className="bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest">
                    {createAlert.isPending ? "Criando..." : "Salvar Alerta"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm bg-slate-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{alerts.length}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alertas Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm bg-slate-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{alerts.filter(a => a.ativo).length}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gatilhos Monitorados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm bg-slate-50/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{users.length}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Usuários Alcancáveis</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Database className="h-3 w-3" />
            Regras de Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
             <div className="h-64 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Consultando gatilhos...</p>
             </div>
          ) : alerts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8">
              <AlertCircle className="h-12 w-12 text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Nenhuma regra configurada</p>
              <Button variant="link" className="text-primary text-[10px] uppercase font-bold" onClick={() => setIsNewDialogOpen(true)}>Clique aqui para criar o primeiro</Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col lg:flex-row lg:items-center gap-6">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tighter">{alert.titulo}</h3>
                      {getTipoBadge(alert.tipo)}
                      {!alert.ativo && <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-slate-300 text-slate-400 font-bold">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">{alert.mensagem}</p>
                    
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <Zap className="h-3 w-3 text-primary" />
                        Trigger: Status da OS = {(alert.condicao_disparo as any)?.valor}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <Users className="h-3 w-3" />
                        Público: {alert.destinatarios?.length} usuários
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end lg:self-center bg-slate-100/50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`active-${alert.id}`} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</Label>
                      <Switch 
                        id={`active-${alert.id}`} 
                        checked={alert.ativo} 
                        onCheckedChange={(checked) => toggleAlert.mutate({ id: alert.id, ativo: checked })}
                      />
                    </div>
                    <div className="h-6 w-px bg-slate-300" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir esta regra?")) {
                          deleteAlert.mutate(alert.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}