import { createFileRoute } from "@tanstack/react-router";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Calculator, 
  Save, 
  FileDown, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/os/$id/orcamento")({
  component: OrcamentoOSPage,
});

interface ItemOrcamento {
  id: string;
  descricao: string;
  qtd: number;
  valorUnit: number;
  total: number;
}

function OrcamentoOSPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { podeVerValoresFinanceiros } = useUserRole();
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [imposto, setImposto] = useState(8.5);
  const [margem, setMargem] = useState(25);
  const [comissao, setComissao] = useState(5);
  const [valorFinalManual, setValorFinalManual] = useState<number | null>(null);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<string[]>([]);
  const [osRelacionadas, setOsRelacionadas] = useState<string[]>([id]);

  if (!podeVerValoresFinanceiros) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600 uppercase">Acesso Negado</h1>
        <p className="text-slate-500 mt-2">Você não tem permissão para visualizar orçamentos financeiros.</p>
      </div>
    );
  }


  const { data: os } = useQuery({
    queryKey: ['os_detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordens_servico').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: fotos = [] } = useQuery({
    queryKey: ['os_fotos', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('fotos_anexos' as any).select('*').eq('os_id', Number(id));
      if (error) throw error;
      return data;
    }
  });

  // Regras padrão definidas em Configurações (por CNPJ emissor da OS).
  const { data: configEmpresa } = useQuery({
    queryKey: ['config_empresa_orcamento', os?.empresa_id],
    enabled: !!os,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_empresa')
        .select('*')
        .order('id');
      if (error) throw error;
      const lista = (data || []) as any[];
      return lista.find((c) => c.empresa_id === os?.empresa_id) || lista[0] || null;
    }
  });

  const [regrasAplicadas, setRegrasAplicadas] = useState(false);
  useEffect(() => {
    if (!configEmpresa || regrasAplicadas) return;
    if (configEmpresa.imposto_padrao != null) setImposto(Number(configEmpresa.imposto_padrao));
    if (configEmpresa.margem_padrao != null && Number(configEmpresa.margem_padrao) > 0) {
      setMargem(Number(configEmpresa.margem_padrao));
    }
    setRegrasAplicadas(true);
  }, [configEmpresa, regrasAplicadas]);


  // Vendedor responsável pelo cliente da OS (regra de comissão vem do cadastro).
  const { data: vendedor } = useQuery({
    queryKey: ['vendedor_da_os', os?.cliente_id],
    enabled: !!os?.cliente_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('vendedor_id, vendedores ( * )')
        .eq('id', (os as any).cliente_id)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.vendedores || null) as any;
    }
  });

  // Custos reais da OS (peças e terceirizados) para a regra de margem bruta.
  const { data: custosOS = [] } = useQuery({
    queryKey: ['os_custos_comissao', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('os_custos').select('*').eq('os_id', id);
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  // Faturamento acumulado do vendedor no mês (regra por metas).
  const { data: faturamentoMes = 0 } = useQuery({
    queryKey: ['faturamento_mes_vendedor', vendedor?.id],
    enabled: !!vendedor?.id && vendedor?.tipo_comissao === 'metas',
    queryFn: async () => {
      const inicio = new Date();
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('valor_total, clientes!inner(vendedor_id)')
        .eq('clientes.vendedor_id' as any, vendedor.id)
        .gte('criado_em', inicio.toISOString());
      if (error) throw error;
      return (data || []).reduce((acc: number, o: any) => acc + Number(o.valor_total || 0), 0);
    }
  });

  const custoBase = useMemo(() => itens.reduce((acc, item) => acc + item.total, 0), [itens]);

  const { custoPecas, custoTerceiros } = useMemo(() => {
    let pecas = 0;
    let terceiros = 0;
    for (const c of custosOS) {
      const valor = Number(c.custo_interno || 0);
      if (c.is_terceirizado || String(c.categoria || '').toLowerCase().includes('terceir')) {
        terceiros += valor;
      } else if (String(c.categoria || '').toLowerCase().includes('pec')) {
        pecas += valor;
      }
    }
    return { custoPecas: pecas, custoTerceiros: terceiros };
  }, [custosOS]);

  const calculos = useMemo(() => {
    const valorImposto = custoBase * (imposto / 100);
    const custoComImposto = custoBase + valorImposto;

    let valorFinal = valorFinalManual !== null ? valorFinalManual : custoComImposto * (1 + (margem / 100));

    // Se o valor final foi definido manualmente, recalcula a margem efetiva
    const margemEfetiva = valorFinalManual !== null
      ? ((valorFinalManual / custoComImposto) - 1) * 100
      : margem;

    const lucroEstimado = valorFinal - custoComImposto;
    const resultadoComissao = calcularComissao(vendedor, {
      valorOS: valorFinal,
      custoPecas,
      custoTerceiros,
      faturamentoMes: Number(faturamentoMes) + valorFinal,
    });

    return {
      valorImposto,
      valorFinal,
      lucroEstimado,
      valorComissao: resultadoComissao.valor,
      descricaoComissao: resultadoComissao.descricao,
      margemEfetiva
    };
  }, [custoBase, imposto, margem, valorFinalManual, vendedor, custoPecas, custoTerceiros, faturamentoMes]);


  const addItem = () => {
    const newItem: ItemOrcamento = {
      id: Math.random().toString(36).substr(2, 9),
      descricao: "",
      qtd: 1,
      valorUnit: 0,
      total: 0
    };
    setItens([...itens, newItem]);
  };

  const updateItem = (itemId: string, updates: Partial<ItemOrcamento>) => {
    setItens(itens.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates };
        updated.total = updated.qtd * updated.valorUnit;
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItens(itens.filter(item => item.id !== itemId));
  };

  const handleSalvarVersao = () => {
    toast.success("Versão do orçamento salva com sucesso!");
  };

  const handleGerarPDF = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
      loading: 'Gerando proposta comercial...',
      success: 'PDF gerado com sucesso!',
      error: 'Erro ao gerar PDF',
    });
  };

  const toggleFoto = (url: string) => {
    setFotosSelecionadas(prev => 
      prev.includes(url) ? prev.filter(f => f !== url) : [...prev, url]
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
            OS / #{os?.id} / Orçamento
          </h2>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">
            Orçamento Comercial
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 font-bold uppercase text-[10px] tracking-widest border-slate-300" onClick={handleSalvarVersao}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Versão
          </Button>
          <Button className="h-10 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-6" onClick={handleGerarPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Gerar PDF Proposta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Parâmetros */}
        <div className="space-y-6">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-slate-50 border-b border-border/50">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Parâmetros Financeiros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Custo Base (calculado)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                  <Input 
                    readOnly 
                    value={custoBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                    className="pl-9 bg-slate-50 border-slate-200 font-bold text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Imposto (%)</Label>
                  <Input 
                    type="number"
                    value={imposto}
                    onChange={(e) => setImposto(Number(e.target.value))}
                    className="border-slate-200 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Margem (%)</Label>
                  <Input 
                    type="number"
                    value={valorFinalManual !== null ? calculos.margemEfetiva.toFixed(1) : margem}
                    onChange={(e) => {
                      setMargem(Number(e.target.value));
                      setValorFinalManual(null);
                    }}
                    className={`border-slate-200 font-bold ${valorFinalManual !== null ? 'text-primary' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Valor Final Sugerido</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                  <Input 
                    type="number"
                    value={valorFinalManual !== null ? valorFinalManual : calculos.valorFinal.toFixed(2)}
                    onChange={(e) => setValorFinalManual(Number(e.target.value))}
                    className={`pl-9 border-slate-200 font-black text-slate-900 ${valorFinalManual !== null ? 'border-primary ring-1 ring-primary' : ''}`}
                  />
                </div>
                {valorFinalManual !== null && (
                  <p className="text-[9px] font-bold text-primary uppercase tracking-tighter">* Valor ajustado manualmente</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Comissão (%)</Label>
                <Input 
                  type="number"
                  value={comissao}
                  onChange={(e) => setComissao(Number(e.target.value))}
                  className="border-slate-200 font-bold"
                />
              </div>

              <div className="pt-4 border-t border-dashed border-slate-200 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-500">Lucro Estimado</span>
                  <span className="text-emerald-600">R$ {calculos.lucroEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-500">Imposto (R$)</span>
                  <span className="text-slate-700">R$ {calculos.valorImposto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-500">Comissão (R$)</span>
                  <span className="text-slate-700">R$ {calculos.valorComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <Button className="w-full bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest h-10 mt-2">
                <Calculator className="mr-2 h-4 w-4" />
                Calcular
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Itens e OS Associadas */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border shadow-md">
            <CardHeader className="bg-slate-50 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Ordens de Serviço associadas
              </CardTitle>
              <Button variant="ghost" className="text-[9px] font-black uppercase text-primary">+ Adicionar OS</Button>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {osRelacionadas.map(osId => (
                  <Badge key={osId} variant="secondary" className="px-3 py-1 bg-slate-100 text-slate-700 font-bold uppercase text-[10px] gap-2 border-slate-200">
                    OS #{os?.id}
                    <button className="hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
            <CardHeader className="bg-slate-50 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Itens do Orçamento
              </CardTitle>
              <Button variant="ghost" className="text-[9px] font-black uppercase text-primary" onClick={addItem}>+ Adicionar Item</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-border">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Descrição</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-20">Qtd</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-32">Valor Unit.</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-32">Total</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase italic">
                        Nenhum item adicionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 border-border">
                        <TableCell>
                          <Input 
                            value={item.descricao} 
                            onChange={(e) => updateItem(item.id, { descricao: e.target.value })}
                            className="h-8 text-xs border-slate-200 bg-white uppercase font-bold"
                            placeholder="Descrição do serviço ou peça..."
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.qtd} 
                            onChange={(e) => updateItem(item.id, { qtd: Number(e.target.value) })}
                            className="h-8 text-xs border-slate-200 bg-white text-center font-bold"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">R$</span>
                            <Input 
                              type="number" 
                              value={item.valorUnit} 
                              onChange={(e) => updateItem(item.id, { valorUnit: Number(e.target.value) })}
                              className="h-8 text-xs border-slate-200 bg-white pl-7 font-bold text-slate-700"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black text-slate-900">
                          R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="p-4 bg-slate-50 border-t flex justify-end">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                  Total Itens: <span className="text-primary ml-2 text-sm">R$ {custoBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
            <CardHeader className="bg-slate-50 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Fotos da OS
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Selecionar para PDF</span>
                <Checkbox 
                  checked={fotosSelecionadas.length === fotos.length && fotos.length > 0} 
                  onCheckedChange={(checked) => {
                    if (checked) setFotosSelecionadas(fotos.map(f => (f as any).url_arquivo));
                    else setFotosSelecionadas([]);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {fotos.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-[10px] font-bold text-slate-400 uppercase border-2 border-dashed border-slate-100 rounded-xl">
                    Nenhuma foto registrada nesta OS.
                  </div>
                ) : (
                  fotos.map((foto, idx) => (
                    <div key={idx} className="group relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-primary transition-all">
                      <img src={(foto as any).url_arquivo} className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 flex items-center justify-between backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-all">
                        <span className="text-[8px] font-bold text-white uppercase truncate">{foto.tipo || `Foto ${idx + 1}`}</span>
                        <Checkbox 
                          checked={fotosSelecionadas.includes((foto as any).url_arquivo)} 
                          onCheckedChange={() => toggleFoto((foto as any).url_arquivo)}
                          className="border-white data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                      {fotosSelecionadas.includes((foto as any).url_arquivo) && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <p className="mt-4 text-[9px] text-muted-foreground font-bold uppercase tracking-tight italic">
                * Clique na miniatura para ampliar. Use o checkbox para incluir/excluir fotos do PDF.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3 pt-6 border-t">
         <Button variant="outline" className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest border-slate-300">
            Cancelar
         </Button>
         <Button className="h-10 px-8 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200" onClick={handleSalvarVersao}>
            Salvar Versão
         </Button>
         <Button className="h-10 px-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20" onClick={handleGerarPDF}>
            Gerar PDF Proposta
         </Button>
      </div>
    </div>
  );
}
