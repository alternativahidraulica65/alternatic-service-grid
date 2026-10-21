import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BellRing, Clock, FileClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIA = 1000 * 60 * 60 * 24;
const STATUS_FINAIS = ["entregue", "encerrado", "cancelada", "cancelado"];

function diasDesde(valor?: string | null) {
  if (!valor) return null;
  return Math.floor((Date.now() - new Date(valor).getTime()) / DIA);
}

/** Lembretes automáticos: orçamentos sem resposta e OS sem movimento. */
export function LembretesCard() {
  const [limite, setLimite] = useState("3");
  const [aberto, setAberto] = useState(false);
  const dias = Number(limite) || 3;

  const { data: ordens = [] } = useQuery({
    queryKey: ["lembretes_painel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          "id, numero_os, cliente, status, updated_at, criado_em, orcamento_enviado_em, orcamento_resposta, valor_final",
        )
        .order("updated_at", { ascending: true })
        .limit(400);
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const ativas = ordens.filter((os) => !STATUS_FINAIS.includes(String(os.status || "").toLowerCase()));

  const semResposta = ativas
    .filter((os) => os.orcamento_enviado_em && !os.orcamento_resposta)
    .map((os) => ({ ...os, dias: diasDesde(os.orcamento_enviado_em) ?? 0 }))
    .filter((os) => os.dias >= dias)
    .sort((a, b) => b.dias - a.dias);

  const paradas = ativas
    .map((os) => ({ ...os, dias: diasDesde(os.updated_at || os.criado_em) ?? 0 }))
    .filter((os) => os.dias >= dias)
    .sort((a, b) => b.dias - a.dias);

  const total = semResposta.length + paradas.length;

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={`Lembretes: ${total}`}
        className={`flex w-full items-center gap-3 rounded-md border bg-card px-4 py-3 text-left transition-colors hover:border-primary ${total > 0 ? "border-l-4 border-l-primary border-border" : "border-border"}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${total > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          <BellRing className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lembretes</span>
          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><FileClock className="h-3 w-3" />{semResposta.length} sem resposta</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{paradas.length} paradas</span>
          </span>
        </span>
        <span className="text-2xl font-black tabular-nums text-foreground">{total}</span>
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-widest">Lembretes automáticos</DialogTitle>
          </DialogHeader>
          <Select value={limite} onValueChange={setLimite}>
            <SelectTrigger className="h-8 w-[160px] text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">A partir de 2 dias</SelectItem>
              <SelectItem value="3">A partir de 3 dias</SelectItem>
              <SelectItem value="5">A partir de 5 dias</SelectItem>
              <SelectItem value="10">A partir de 10 dias</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid gap-4 md:grid-cols-2">
            <Bloco titulo="Orçamentos sem resposta" icone={<FileClock className="h-3.5 w-3.5 text-primary" />}
              itens={semResposta} vazio="Nenhum orçamento aguardando retorno." sufixo="dias sem resposta" />
            <Bloco titulo="OS sem movimento" icone={<Clock className="h-3.5 w-3.5 text-primary" />}
              itens={paradas} vazio="Todas as OS tiveram movimento recente." sufixo="dias parada" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Bloco({
  titulo,
  icone,
  itens,
  vazio,
  sufixo,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: any[];
  vazio: string;
  sufixo: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {icone} {titulo} ({itens.length})
      </p>
      {itens.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-1">
          {itens.slice(0, 30).map((os) => (
            <li key={os.id} className="flex items-center justify-between gap-2 border-b border-border/40 py-1 last:border-0">
              <span className="min-w-0">
                <span className="font-mono text-xs font-bold">{os.numero_os}</span>
                <span className="ml-2 truncate text-[11px] text-muted-foreground">{os.cliente}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-bold uppercase">
                  {os.dias} {sufixo}
                </Badge>
                <Button asChild size="sm" variant="ghost" className="h-7 text-[9px] font-black uppercase">
                  <Link to="/os/$id" params={{ id: os.id }}>
                    Abrir
                  </Link>
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
