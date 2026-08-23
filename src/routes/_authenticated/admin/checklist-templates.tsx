import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/admin/checklist-templates")({
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

  const { data: tipos = [] } = useQuery({
    queryKey: ['tipos_equipamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tipos_equipamento').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['checklist_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_templates' as any)
        .select('*, tipos_equipamento(nome)');
      if (error) throw error;
      return data;
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
    if (!selectedTipo || !templateName || itens.length === 0) {
      toast.error("Preencha todos os campos e adicione pelo menos um item.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('checklist_templates' as any)
        .insert({
          tipo_equipamento_id: selectedTipo,
          nome: templateName,
          itens: itens
        });

      if (error) throw error;

      toast.success("Template salvo com sucesso!");
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de Equipamento</Label>
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
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome do Template</Label>
              <Input 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Revisão Preventiva Hidráulica"
                className="border-slate-200 bg-white text-xs font-bold"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2">Adicionar Itens</Label>
              <div className="flex gap-2">
                <Input 
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Nome do item..."
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
              {saving ? "Salvando..." : "Salvar Template"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {templates.map((tpl: any) => (
              <Card key={tpl.id} className="border-border shadow-md hover:border-primary/50 transition-all group">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest mb-2">
                        {tpl.tipos_equipamentos?.nome || 'Geral'}
                      </Badge>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{tpl.nome}</h3>
                    </div>
                    <Settings className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {tpl.itens?.length || 0} Itens de Verificação
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.itens?.slice(0, 3).map((it: any, i: number) => (
                        <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase">{it.label}</span>
                      ))}
                      {tpl.itens?.length > 3 && <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold">+{tpl.itens.length - 3}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="p-20 text-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200">
              <ClipboardCheck className="h-12 w-12 text-slate-200 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum template configurado</p>
                <p className="text-xs text-slate-400 font-medium">Comece criando um template para seus equipamentos à esquerda.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
