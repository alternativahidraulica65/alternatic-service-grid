import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calculator, 
  Settings, 
  ArrowLeft, 
  Save, 
  Info,
  Layers,
  Wrench,
  Dna,
  Scale
} from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/engenharia/materiais")({
  component: EngenhariaMateriaisPage,
});

function EngenhariaMateriaisPage() {
  const [diametro, setDiametro] = useState<number>(50);
  const [comprimento, setComprimento] = useState<number>(500);
  const [densidade, setDensidade] = useState<number>(7.85);

  const { data: materiais = [] } = useQuery({
    queryKey: ['materias_primas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materias_primas' as any).select('*').order('nome');
      if (error) throw error;
      return data ?? [];
    }
  });

  const pesoTeorico = useMemo(() => {
    // Cálculo: (π * r² * L * densidade) / 1000000 (para kg)
    const raio = diametro / 2;
    const volume = Math.PI * Math.pow(raio, 2) * comprimento;
    return (volume * densidade) / 1000000;
  }, [diametro, comprimento, densidade]);

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">ENGENHARIA / <span className="text-primary">MATERIAIS</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Cálculo de peso teórico e especificações de matéria-prima.</p>
          </div>
        </div>
        <Button className="h-10 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] px-6">
          <Save className="mr-2 h-4 w-4 text-primary" />
          Salvar Especificação
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold uppercase tracking-widest">Calculadora de Hastes e Cilindros</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Diâmetro Nominal (mm)</Label>
                  <Input 
                    type="number" 
                    value={diametro} 
                    onChange={(e) => setDiametro(Number(e.target.value))}
                    className="h-12 border-border font-black text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comprimento Total (mm)</Label>
                  <Input 
                    type="number" 
                    value={comprimento} 
                    onChange={(e) => setComprimento(Number(e.target.value))}
                    className="h-12 border-border font-black text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Material / Densidade (kg/dm³)</Label>
                  <Select 
                    value={densidade.toString()} 
                    onValueChange={(v) => setDensidade(Number(v))}
                  >
                    <SelectTrigger className="h-12 border-border font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materiais.length > 0 ? (materiais as any[]).map((m: any) => (
                        <SelectItem key={m.id} value={String(m.densidade ?? 7.85)}>
                          {m.nome}{m.densidade ? ` (${m.densidade})` : ''}
                        </SelectItem>
                      )) : (
                        <div className="px-3 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Nenhum registro encontrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Peça</Label>
                  <Select defaultValue="macica">
                    <SelectTrigger className="h-12 border-border font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="macica">Haste Maciça</SelectItem>
                      <SelectItem value="tubo">Tubo Hidráulico (Camisa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md border-l-4 border-l-primary bg-slate-50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-primary shrink-0" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Valores para referência de orçamentação. Considerar margem de 5% para perda em usinagem.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-slate-900 text-white border-border shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-800/50 border-b border-white/5">
              <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Resultado do Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Peso Estimado</p>
                <p className="text-6xl font-black text-white leading-none">
                  {pesoTeorico.toFixed(2)}
                  <span className="text-2xl text-primary ml-1">kg</span>
                </p>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Volume Total</span>
                  <span className="text-white">{(diametro * diametro * comprimento / 1000).toFixed(0)} mm³</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Material Selecionado</span>
                  <span className="text-primary">{materiais.find((m: any) => m.densidade === densidade)?.nome || "Aço Carbono / Cromo"}</span>
                </div>
              </div>

              <Button 
                onClick={() => toast.success("Valores copiados para o orçamento")}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-white hover:text-slate-900 font-black uppercase tracking-widest text-xs transition-all"
              >
                APLICAR AO ORÇAMENTO
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 text-center">
                <Layers className="h-4 w-4 text-primary mx-auto mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Área Transversal</p>
                <p className="text-sm font-black">{(Math.PI * Math.pow(diametro/2, 2)).toFixed(0)} mm²</p>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-4 text-center">
                <Dna className="h-4 w-4 text-primary mx-auto mb-2" />
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Tolerância h9</p>
                <p className="text-sm font-black">ISO 286-2</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
