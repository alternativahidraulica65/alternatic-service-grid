import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analisarDuplicidadeCustos, type ResultadoDuplicidade } from "@/lib/custos-duplicidade.functions";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AnaliseDuplicidadeCustos({ osId, custos, fornecedores }: { osId: string; custos: any[]; fornecedores: any[] }) {
  const analisar = useServerFn(analisarDuplicidadeCustos);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDuplicidade | null>(null);

  const executar = async () => {
    setCarregando(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      const { data: os } = await supabase
        .from("ordens_servico" as any)
        .select("*")
        .eq("id", osId)
        .maybeSingle();
      const nomeForn = new Map(fornecedores.map((f: any) => [f.id, f.nome]));
      const o: any = os ?? {};
      const r = await analisar({
        data: {
          accessToken: token,
          contexto: {
            numero_os: o.numero_os ? String(o.numero_os) : null,
            equipamento: (o.equipamento ?? o.modelo_equipamento) ? String(o.equipamento ?? o.modelo_equipamento).slice(0, 300) : null,
            defeitos: (o.laudo_defeitos ?? o.defeitos) ? String(o.laudo_defeitos ?? o.defeitos).slice(0, 3000) : null,
            servicos: (o.laudo_servicos_necessarios ?? o.servicos_necessarios) ? String(o.laudo_servicos_necessarios ?? o.servicos_necessarios).slice(0, 3000) : null,
          },
          itens: custos.map((c) => ({
            id: String(c.id),
            descricao: String(c.descricao ?? "").slice(0, 500),
            categoria: c.categoria ?? null,
            valor: c.custo_interno != null ? Number(c.custo_interno) : null,
            fornecedor: (nomeForn.get(c.fornecedor_id) as string) ?? c.terceiro_nome ?? null,
            criado_em: c.criado_em ?? null,
            pago: !!c.pago,
          })),
        },
      });
      setResultado(r);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro na análise");
    } finally {
      setCarregando(false);
    }
  };

  if (custos.length < 2) return null;
  const porId = new Map(custos.map((c) => [String(c.id), c]));

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Verificação de duplicidade (IA)
        </p>
        <div className="flex gap-2">
          {resultado && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setResultado(null)} aria-label="Fechar análise">
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={executar} disabled={carregando} className="text-xs font-bold uppercase">
            {carregando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {carregando ? "Analisando..." : "Verificar duplicados"}
          </Button>
        </div>
      </div>
      {resultado && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{resultado.resumo}</p>
          {resultado.grupos.length === 0 ? (
            <p className="text-xs flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Nenhum lançamento suspeito.</p>
          ) : (
            resultado.grupos.map((g, i) => (
              <div key={i} className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <Badge variant="outline" className="text-[9px] font-black uppercase">Confiança {g.confianca}</Badge>
                </div>
                <ul className="text-xs list-disc pl-5">
                  {g.ids.map((id) => {
                    const c: any = porId.get(id);
                    return <li key={id}>{c?.descricao ?? id} — {brl(Number(c?.custo_interno ?? 0))}</li>;
                  })}
                </ul>
                <p className="text-xs"><strong>Motivo:</strong> {g.motivo}</p>
                <p className="text-xs text-muted-foreground"><strong>Sugestão:</strong> {g.sugestao}</p>
              </div>
            ))
          )}
          <p className="text-[10px] text-muted-foreground">Análise automática: confira antes de remover qualquer custo.</p>
        </div>
      )}
    </div>
  );
}
