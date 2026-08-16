import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Box, 
  Calculator, 
  Save, 
  Trash2, 
  Plus,
  Scale,
  DollarSign,
  Info
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
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/engenharia/materiais")({
  component: MateriaisPage,
});

function MateriaisPage() {
  const queryClient = useQueryClient();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [diametro, setDiametro] = useState<number>(0);
  const [comprimento, setComprimento] = useState<number>(0);

  const { data: materiais } = useSuspenseQuery({
    queryKey: ['materiais_base'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materiais').select('*');
      if (error) throw error;
      return data;
    }
  });

  const material = materiais?.find(m => m.id === selectedMaterialId);
  
  // Cálculo: Volume = π * r² * L
  // Raio em decímetros (dm) para que densidade em kg/dm³ resulte em kg
  // 1 mm = 0.01 dm
  const raioDm = (diametro / 2) * 0.01;
  const comprimentoDm = comprimento * 0.01;
  const volumeDm3 = Math.PI * Math.pow(raioDm, 2) * comprimentoDm;
  const pesoEstimado = volumeDm3 * (Number(material?.densidade) || 0);
  const custoEstimado = pesoEstimado * (Number(material?.preco_base_kg) || 0);

  return (
    <div className="min-h-screen bg-slate-50 industrial-theme pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Matéria-Prima Inteligente</h1>
          </div>
          <Button className="btn-industrial bg-slate-900 text-primary hover:bg-slate-800">
            <Plus className="mr-2 h-4 w-4" />
            Novo Cadastro
          </Button>
        </div>
      </header>

      <main className="container-industrial mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-sm border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Calculadora de Peso Teórico
              </CardTitle>
              <CardDescription>Cálculo baseado em barras redondas e densidade do material.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Material Base</Label>
                  <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {materiais?.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Densidade (kg/dm³)</Label>
                  <Input 
                    value={material?.densidade || ""} 
                    disabled 
                    className="bg-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Diâmetro (mm)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 50.8" 
                    value={diametro || ""}
                    onChange={e => setDiametro(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comprimento (mm)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 1000" 
                    value={comprimento || ""}
                    onChange={e => setComprimento(Number(e.target.value))}
                  />
                </div>
              </div>

              {material && (
                <div className="p-6 rounded-xl bg-slate-900 text-white space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Peso Estimado</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-primary">{pesoEstimado.toFixed(3)}</span>
                      <span className="text-sm font-bold text-primary">kg</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custo de Material</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-slate-400">R$</span>
                      <span className="text-2xl font-black text-emerald-400">
                        {custoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Base de Dados de Materiais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {materiais?.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-white">
                    <div>
                      <p className="font-bold text-slate-900">{m.nome}</p>
                      <p className="text-[10px] text-slate-500">DENSIDADE: {m.densidade} kg/dm³</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-slate-700">R$ {Number(m.preco_base_kg).toFixed(2)} /kg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Informação Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-4 leading-relaxed">
              <p>
                O cálculo de peso teórico é fundamental para a orçamentação precisa de usinagem e fabricação de hastes e camisas.
              </p>
              <div className="p-3 bg-white rounded border border-primary/10 font-mono">
                Fórmula: (π * r² * L) * δ
                <br />
                δ = Densidade específica
              </div>
              <p className="font-bold text-slate-900 italic">
                Nota: Adicione sempre 5% de margem para perdas de corte e cavacos.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}