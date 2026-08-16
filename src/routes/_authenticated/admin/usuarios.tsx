import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  UserPlus, 
  Settings, 
  ShieldCheck, 
  UserCircle, 
  Mail, 
  User, 
  Percent,
  ChevronRight,
  Shield,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: GestaoUsuariosPage,
});

function GestaoUsuariosPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: profiles } = useSuspenseQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('usuarios').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: comissoes } = useSuspenseQuery({
    queryKey: ['configuracoes_comissao_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracoes_vendedores').select('*');
      if (error) throw error;
      return data;
    }
  });

  const selectedProfile = profiles?.find(p => p.id === selectedUserId);
  const selectedConfig = comissoes?.find(c => c.user_id === selectedUserId);

  const handleUpdateConfig = async (regra: string, perc: number) => {
    if (!selectedUserId) return;
    try {
      const { error } = await supabase
        .from('configuracoes_vendedores')
        .upsert({
          user_id: selectedUserId,
          regra_comissao: regra as any,
          porcentagem_padrao: perc
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success("Configuração de comissão atualizada!");
      queryClient.invalidateQueries({ queryKey: ['configuracoes_comissao_list'] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 industrial-theme pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Gestão de Usuários e Comissões</h1>
          </div>
          <Button className="btn-industrial">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>
      </header>

      <main className="container-industrial mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Colaboradores ({profiles?.length || 0})</h2>
          </div>
          
          <div className="space-y-2">
            {profiles?.map(profile => (
              <Card 
                key={profile.id} 
                className={`cursor-pointer transition-all hover:border-primary ${selectedUserId === profile.id ? 'border-primary shadow-md bg-white' : 'bg-slate-50 border-slate-200'}`}
                onClick={() => setSelectedUserId(profile.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${selectedUserId === profile.id ? 'bg-primary' : 'bg-slate-300'}`}>
                      <UserCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{profile.nome}</h3>
                      <p className="text-[10px] text-slate-500 uppercase">{profile.perfil || 'Usuário'}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-slate-300 transition-transform ${selectedUserId === profile.id ? 'rotate-90 text-primary' : ''}`} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7">
          {selectedProfile ? (
            <Card className="shadow-sm border-t-4 border-t-primary bg-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-display text-slate-900">{selectedProfile.nome}</CardTitle>
                    <CardDescription>{selectedProfile.email}</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary text-primary bg-primary/5 uppercase text-[10px] font-bold">
                    {selectedProfile.perfil}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                      <Settings className="h-4 w-4" />
                      Acesso ao Sistema
                    </h4>
                    <div className="space-y-2">
                      <Label>Perfil / Role</Label>
                      <Select defaultValue={selectedProfile.perfil || "operador"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diretor">Diretor</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="financeiro">Financeiro</SelectItem>
                          <SelectItem value="operador">Operador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold flex items-center gap-2 text-slate-700">
                      <Percent className="h-4 w-4 text-primary" />
                      Regra de Comissão
                    </h4>
                    <div className="space-y-2">
                      <Label>Regra de Negócio</Label>
                      <Select 
                        value={selectedConfig?.regra_comissao || "padrao"}
                        onValueChange={(v) => handleUpdateConfig(v, selectedConfig?.porcentagem_padrao || 5)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="padrao">Comissão Padrão</SelectItem>
                          <SelectItem value="divisao_50_50">Divisão 50/50 (Lucro)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Porcentagem Base (%)</Label>
                      <Input 
                        type="number" 
                        value={selectedConfig?.porcentagem_padrao || 5}
                        onChange={(e) => handleUpdateConfig(selectedConfig?.regra_comissao || "padrao", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desativar Acesso
                  </Button>
                  <Button className="btn-industrial">
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 bg-white rounded-xl border-2 border-dashed">
              <User className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">Selecione um colaborador para gerenciar permissões e comissões.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}