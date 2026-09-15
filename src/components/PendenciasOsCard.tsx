import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  avaliarFluxo,
  FASES,
  indiceFase,
  ROTULO_FASE,
  type Fase,
} from "@/lib/os-fluxo";

/** Aba da OS correspondente a cada fase (usa os mesmos valores do Tabs da tela). */
const TAB_DA_FASE: Partial<Record<Fase, string>> = {
  criacao: "resumo",
  checklist: "checklist",
  laudo: "laudo-técnico",
  custos: "custos",
  orcamento: "orçamento",
  aprovacao: "aprovação",
  execucao: "execução",
  pronto: "execução",
  entrega: "entrega",
};

interface Props {
  os: any;
  checklist?: any[];
  custos?: any[];
  pecas?: any[];
  onIrPara?: (tab: string) => void;
}

/**
 * Bloco "O que falta nesta OS": mostra as pendências que travam o avanço,
 * já ordenadas pela sequência oficial, com atalho para a aba correspondente.
 */
export function PendenciasOsCard({ os, checklist = [], custos = [], pecas = [], onIrPara }: Props) {
  if (!os) return null;

  const resultado = avaliarFluxo(os, { checklist, custos, pecas });
  const idxAtual = indiceFase(resultado.faseAtual);

  // Pendências das fases já alcançadas (inclui a fase atual) — as futuras ainda não travam.
  const lista = FASES.filter((f) => indiceFase(f) <= idxAtual).flatMap((fase) =>
    resultado.pendencias[fase].map((texto) => ({ fase, texto })),
  );

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="border-b border-border/50 bg-muted/10 py-3">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          {lista.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          O que falta nesta OS
          <span className="ml-auto text-[9px] font-bold text-muted-foreground">
            Fase atual: {ROTULO_FASE[resultado.faseAtual]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {lista.length === 0 ? (
          <p className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-emerald-700">
            Nada pendente até aqui — a OS pode avançar.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {lista.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {ROTULO_FASE[item.fase]}
                  </p>
                  <p className="truncate text-xs font-bold text-foreground">{item.texto}</p>
                </div>
                {onIrPara && TAB_DA_FASE[item.fase] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-[9px] font-black uppercase tracking-widest text-primary"
                    onClick={() => onIrPara(TAB_DA_FASE[item.fase]!)}
                  >
                    Resolver <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
