import { useEffect, useRef, useState } from "react";
import { AlarmClock, CalendarClock, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fmt = (d: Date) =>
  `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

function duracao(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${p(h)}:${p(m)}:${p(sec)}`;
}

const ENCERRADOS = ["entregue", "encerrada", "encerrado"];
const ORCAMENTO_PENDENTE = ["aberta", "triagem", "vistoria", "aguardando_gestor", ""];

/** Prazo vigente: orçamento enquanto não orçada; depois previsão de conclusão; sem dados, fim do dia de abertura. */
export function prazoDaOs(os: any): { prazo: Date; rotulo: string } | null {
  const abertura = os?.data_abertura || os?.criado_em;
  const status = String(os?.status ?? "").toLowerCase();
  if (ORCAMENTO_PENDENTE.includes(status) && os?.prazo_orcamento)
    return { prazo: new Date(os.prazo_orcamento), rotulo: "Prazo do orçamento" };
  if (os?.data_previsao_conclusao) return { prazo: new Date(os.data_previsao_conclusao), rotulo: "Prazo final" };
  if (!abertura) return null;
  const d = new Date(abertura);
  d.setHours(23, 59, 0, 0);
  return { prazo: d, rotulo: "Prazo final" };
}

export function SlaOs({ os }: { os: any }) {
  const [agora, setAgora] = useState(() => Date.now());
  const avisado = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const abertura = os?.data_abertura || os?.criado_em ? new Date(os.data_abertura || os.criado_em) : null;
  const p = prazoDaOs(os);
  const encerrada = ENCERRADOS.includes(String(os?.status ?? "").toLowerCase());
  const restante = p ? p.prazo.getTime() - agora : null;
  const atrasada = !encerrada && restante !== null && restante < 0;
  const critico = !encerrada && restante !== null && restante >= 0 && restante < 4 * 3600 * 1000;

  useEffect(() => {
    if (atrasada && !avisado.current && os?.id) {
      avisado.current = true;
      supabase.rpc("notificar_atraso_os" as any, { p_os_id: os.id }).then(() => {});
    }
  }, [atrasada, os?.id]);

  const tom = atrasada
    ? "border-destructive/50 bg-destructive/10 text-destructive"
    : critico
      ? "border-primary/60 bg-primary/10 text-foreground"
      : "border-border bg-card text-foreground";

  return (
    <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
      <div className="flex items-center gap-3 bg-card px-4 py-3">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Aberto em</p>
          <p className="text-sm font-bold tabular-nums">{abertura ? fmt(abertura) : "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-card px-4 py-3">
        <AlarmClock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{p?.rotulo ?? "Prazo final"}</p>
          <p className="text-sm font-bold tabular-nums">{p ? fmt(p.prazo) : "—"}</p>
        </div>
      </div>
      <div className={`flex items-center gap-3 px-4 py-3 ${tom}`}>
        <Hourglass className="h-4 w-4" />
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-80">
            {encerrada ? "Situação" : atrasada ? "Em atraso há" : "Tempo restante"}
          </p>
          <p className="font-mono text-base font-black tabular-nums">
            {encerrada ? "OS encerrada" : restante === null ? "—" : duracao(restante)}
          </p>
        </div>
      </div>
    </div>
  );
}
