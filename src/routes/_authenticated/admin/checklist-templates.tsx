import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Save, 
  Settings,
  PlusCircle,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/checklist-templates")({
  head: () => ({ meta: [
    { title: "Modelos de checklist — Alternativa Hidráulica" },
    { name: "description", content: "Cadastro de equipamentos e modelos de avaliação técnica." },
    { property: "og:title", content: "Modelos de checklist — Alternativa Hidráulica" },
    { property: "og:description", content: "Cadastro de equipamentos e modelos de avaliação técnica." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChecklistTemplatesPage,
});

function ChecklistTemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTipo, setSelectedTipo] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [itens, setItens] = useState<{ label: string; obrigatorio: boolean }[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [tipoOpen, setTipoOpen] = useState(false);
  const [tipoLoading, setTipoLoading] = useState(false);
  const [tipoForm, setTipoForm] = useState({ nome: "", categoria_principal: "", descricao: "" });

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos_equipamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_equipamento').select('*').order('nome');
      if (error) throw error;
      return data ?? [];
    }
  });

  const handleCriarTipoEquipamento = async () => {
    const nome = tipoForm.nome.trim();
    if (!nome) {
      toast.error("Informe o nome do equipamento.");
      return;
    }
    const duplicado = (tipos as any[]).some(
      (t: any) => (t.nome || "").trim().toLowerCase() === nome.toLowerCase()
    );
    if (duplicado) {
      toast.error("Já existe um equipamento com esse nome.");
      return;
    }

    setTipoLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipos_equipamento')
        .insert({
          nome,
          categoria_principal: tipoForm.categoria_principal.trim() || null,
          descricao: tipoForm.descricao.trim() || null,
        })
        .select('id, nome')
        .single();
      if (error) throw error;

      toast.success("Equipamento cadastrado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ['tipos_equipamento'] });
      if (data?.id) setSelectedTipo(data.id);
      setTipoForm({ nome: "", categoria_principal: "", descricao: "" });
      setTipoOpen(false);
    } catch (error: any) {
      toast.error("Erro ao cadastrar equipamento: " + error.message);
    } finally {
      setTipoLoading(false);
    }
  };

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['checklist_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates')
        .select('id, componente_peca, descricao_avaliacao, tipo_equipamento_id, ordem_exibicao, tipos_equipamento(nome)')
        .order('ordem_exibicao', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
  });

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    setItens([...itens, { label: newItem.trim(), obrigatorio: true }]);
    setNewItem("");
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedTipo || itens.length === 0) {
      toast.error("Selecione o tipo de equipamento e adicione pelo menos um componente.");
      return;
    }

    setSaving(true);
    try {
      const existentes = (templates as any[]).filter((t: any) => t.tipo_equipamento_id === selectedTipo);
      const baseOrdem = existentes.reduce((max: number, t: any) => Math.max(max, Number(t.ordem_exibicao ?? 0)), 0);

      const { error } = await supabase
        .from('checklist_templates')
        .insert(itens.map((item, idx) => ({
          tipo_equipamento_id: selectedTipo,
          componente_peca: item.label,
          descricao_avaliacao: templateName || null,
          ordem_exibicao: baseOrdem + idx + 1,
        })) as any);

      if (error) throw error;

      toast.success("Itens de checklist salvos com sucesso!");
      setTemplateName("");
      setItens([]);
      setSelectedTipo("");
      refetchTemplates();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-slate-50 min-h-screen pb-20">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-black text-slate-900 uppercase tracking-tight">
              Gestão de <span className="text-primary">Checklist Templates</span>
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Configuração de itens de verificação por tipo de equipamento
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-border shadow-md">
          <CardHeader className="bg-slate-900 text-white rounded-t-lg">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-primary" />
              Novo Template
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de Equipamento</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary"
                  onClick={() => setTipoOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo equipamento
                </Button>
              </div>
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger className="border-slate-200 bg-white font-bold text-xs uppercase">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t: any) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs font-bold uppercase">{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição da Avaliação</Label>
              <Input 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Avaliar desgaste, folga e vazamentos"
                className="border-slate-200 bg-white text-xs font-bold"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Adicionar Componentes/Peças</Label>
              <div className="flex gap-2">
                <Input 
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Ex: Kit de Vedações"
                  className="border-slate-200 bg-white text-xs font-bold"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <Button size="icon" onClick={handleAddItem} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {itens.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-100 border border-slate-200 group">
                  <span className="text-xs font-bold text-slate-700 uppercase">{item.label}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button 
              className="w-full bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest h-10 shadow-lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Itens"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {(templates as any[]).map((tpl: any) => (
              <Card key={tpl.id} className="border-border shadow-md hover:border-primary/50 transition-all group">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest mb-2">
                        {tpl.tipos_equipamento?.nome || 'Geral'}
                      </Badge>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{tpl.componente_peca}</h3>
                    </div>
                    <Settings className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Ordem {tpl.ordem_exibicao ?? '—'}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {tpl.descricao_avaliacao || 'Sem descrição de avaliação'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="p-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200">
              <ClipboardCheck className="h-12 w-12 text-slate-200 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum registro encontrado</p>
                <p className="text-xs text-slate-400 font-medium">Comece criando um template para seus equipamentos à esquerda.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={tipoOpen} onOpenChange={setTipoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest">Cadastrar novo equipamento</DialogTitle>
            <DialogDescription className="text-xs">
              O novo tipo ficará disponível nos checklists e nas ordens de serviço.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome *</Label>
              <Input
                value={tipoForm.nome}
                onChange={(e) => setTipoForm({ ...tipoForm, nome: e.target.value })}
                placeholder="Ex: Bomba Hidráulica"
                className="border-slate-200 bg-white text-xs font-bold"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCriarTipoEquipamento()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Categoria principal</Label>
              <Input
                value={tipoForm.categoria_principal}
                onChange={(e) => setTipoForm({ ...tipoForm, categoria_principal: e.target.value })}
                placeholder="Ex: Hidráulica, Usinagem, Elétrica"
                className="border-slate-200 bg-white text-xs font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição</Label>
              <Textarea
                value={tipoForm.descricao}
                onChange={(e) => setTipoForm({ ...tipoForm, descricao: e.target.value })}
                placeholder="Detalhe o tipo de equipamento"
                className="border-slate-200 bg-white text-xs font-bold min-h-[70px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipoOpen(false)} disabled={tipoLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarTipoEquipamento}
              disabled={tipoLoading}
              className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest"
            >
              {tipoLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-3 w-3" />
                  Cadastrar equipamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
