import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, FileText, Clock, Wrench, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getExecutorEmail } from "@/lib/log-executor";
import { useUserRole } from "@/hooks/useUserRole";
import { faseDoStatus, type Fase } from "@/lib/os-fluxo";

type Grupo = "checklist" | "orcamento" | "cliente" | "executar";

const GRUPOS: { chave: Grupo; titulo: string; acao: string; icone: any; cor: string }[] = [
  {
    chave: "checklist",
    titulo: "Abrir e fazer checklist",
    acao: "Abrir a OS e preencher o checklist",
    icone: ClipboardList,
    cor: "bg-slate-900 text-white",
  },
  {
    chave: "orcamento",
    titulo: "Passar orçamento",
    acao: "Montar o orçamento",
    icone: FileText,
    cor: "bg-primary text-primary-foreground",
  },
  {
    chave: "cliente",
    titulo: "Aguardando o cliente",
    acao: "Cobrar retorno do cliente",
    icone: Clock,
    cor: "bg-amber-500 text-white",
  },
  {
    chave: "executar",
    titulo: "Aprovadas — executar e entregar",
    acao: "Terminar e entregar",
    icone: Wrench,
    cor: "bg-emerald-600 text-white",
  },
];

const grupoDaFase = (fase: Fase): Grupo | null => {
  switch (fase) {
    case "criacao":
    case "checklist":
      return "checklist";
    case "laudo":
    case "custos":
    case "orcamento":
      return "orcamento";
    case "aprovacao":
      return "cliente";
    case "execucao":
    case "pronto":
      return "executar";
    default:
      return null;
  }
};

const FALTA_DA_FASE: Partial<Record<Fase, string>> = {
  criacao: "Falta o checklist",
  checklist: "Falta finalizar o checklist",
  laudo: "Falta o laudo técnico",
  custos: "Faltam os custos",
  orcamento: "Falta enviar o orçamento",
  aprovacao: "Aguardando resposta do cliente",
  execucao: "Em execução",
  pronto: "Pronto para entrega",
};

const diasParado = (os: any) => {
  const base = os?.updated_at || os?.criado_em || os?.data_abertura;
  if (!base) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(base).getTime()) / 86400000));
};

const corParado = (dias: number) =>
  dias >= 10 ? "border-l-4 border-l-red-500" : dias >= 5 ? "border-l-4 border-l-amber-400" : "";

const semResponsavel = (os: any) => !os?.tecnico_id && !os?.operador_atribuido;

interface Props {
  ordens: any[];
}

export function PainelGestorOs({ ordens }: Props) {
  const { podeGerenciarOS } = useUserRole();
  const queryClient = useQueryClient();
  const [grupoAberto, setGrupoAberto] = useState<Grupo | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["painel_gestor_responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, user_id, nome, cargo, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []).filter((u: any) =>
        ["operador", "tecnico", "gestor"].includes(String(u.cargo ?? "").toLowerCase()),
      );
    },
  });

  const ativas = useMemo(
    () =>
      (ordens ?? [])
        .map((os) => ({ os, fase: faseDoStatus(os.status, os.status_financeiro) }))
        .filter((i) => grupoDaFase(i.fase) !== null),
    [ordens],
  );

  const semDono = useMemo(() => ativas.filter((i) => semResponsavel(i.os)), [ativas]);

  const porGrupo = useMemo(() => {
    const mapa: Record<Grupo, typeof ativas> = {
      checklist: [],
      orcamento: [],
      cliente: [],
      executar: [],
    };
    ativas.forEach((i) => {
      const g = grupoDaFase(i.fase);
      if (g) mapa[g].push(i);
    });
    return mapa;
  }, [ativas]);

  const atribuir = async (os: any, usuario: any) => {
    if (!podeGerenciarOS) {
      toast.error("Você não tem permissão para direcionar OS.");
      return;
    }
    setSalvandoId(String(os.id));
    const { error } = await supabase
      .from("ordens_servico")
      .update({ tecnico_id: usuario.id, operador_atribuido: usuario.user_id ?? null })
      .eq("id", os.id);
    setSalvandoId(null);
    if (error) {
      toast.error(`Não foi possível direcionar: ${error.message}`);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("historico_status_os" as any).insert({
      os_id: os.id,
      status_anterior: String(os.status ?? ""),
      status_novo: String(os.status ?? ""),
      observacao: `Responsável definido: ${usuario.nome}`,
      executor_id: auth?.user?.id ?? null,
      executor_email: await getExecutorEmail(),
    });
    toast.success(`${os.numero_os ?? "OS"} direcionada para ${usuario.nome}`);
    queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_os"] });
  };

  const nomeResponsavel = (os: any) => {
    const u = (responsaveis as any[]).find(
      (r) => r.id === os.tecnico_id || r.user_id === os.operador_atribuido,
    );
    return u?.nome ?? (semResponsavel(os) ? "Sem responsável" : "Responsável definido");
  };

  const listaAberta = grupoAberto ? porGrupo[grupoAberto] : [];

  return (
    <div className="space-y-4">
      {/* Precisa de alguém */}
      <Card className="border-amber-300 shadow-md">
        <CardHeader className="border-b border-amber-200 bg-amber-50/70 py-3">
          <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-900">
            <UserPlus className="h-4 w-4" />
            Precisa de alguém
            <Badge variant="secondary" className="ml-auto text-[9px]">
              {semDono.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {semDono.length === 0 ? (
            <p className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-emerald-700">
              Todas as OS em andamento têm responsável.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {semDono.map(({ os, fase }) => {
                const dias = diasParado(os);
                return (
                  <li
                    key={os.id}
                    className={`flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between ${corParado(dias)}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest text-foreground">
                        {os.numero_os ?? "OS"}{" "}
                        <span className="font-bold text-muted-foreground">· {os.cliente || "Sem cliente"}</span>
                      </p>
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {FALTA_DA_FASE[fase] ?? "Em andamento"} · parada há {dias} dia(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        disabled={!podeGerenciarOS || salvandoId === String(os.id)}
                        onValueChange={(v) => {
                          const u = (responsaveis as any[]).find((r) => r.id === v);
                          if (u) atribuir(os, u);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[190px] text-xs">
                          <SelectValue placeholder="Escolher responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {(responsaveis as any[]).map((r) => (
                            <SelectItem key={r.id} value={r.id} className="text-xs">
                              {r.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button asChild size="sm" variant="ghost" className="text-[10px] font-black uppercase">
                        <Link to="/os/$id" params={{ id: String(os.id) }}>
                          Abrir
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Grupos de situação */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GRUPOS.map((g) => {
          const itens = porGrupo[g.chave];
          const Icone = g.icone;
          const ativo = grupoAberto === g.chave;
          return (
            <Card
              key={g.chave}
              role="button"
              tabIndex={0}
              onClick={() => setGrupoAberto(ativo ? null : g.chave)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setGrupoAberto(ativo ? null : g.chave);
              }}
              className={`cursor-pointer border-none shadow-lg transition-all hover:opacity-95 ${g.cor} ${ativo ? "ring-2 ring-offset-2 ring-primary" : ""}`}
            >
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-1">
                <CardTitle className="text-2xl font-black">
                  {itens.length.toString().padStart(2, "0")}
                </CardTitle>
                <Icone className="h-5 w-5 opacity-80" />
              </CardHeader>
              <CardContent className="space-y-1 p-4 pt-0">
                <p className="text-[10px] font-black uppercase tracking-widest">{g.titulo}</p>
                <p className="text-[10px] font-medium opacity-80">{g.acao}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {grupoAberto && (
        <Card className="border-border shadow-md">
          <CardHeader className="border-b border-border/50 bg-muted/10 py-3">
            <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
              {GRUPOS.find((g) => g.chave === grupoAberto)?.titulo}
              <Badge variant="secondary" className="ml-auto text-[9px]">
                {listaAberta.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {listaAberta.length === 0 ? (
              <p className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Nenhuma OS nesta situação.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {listaAberta.map(({ os, fase }) => {
                  const dias = diasParado(os);
                  const atrasada =
                    (os.prazo_orcamento || os.data_previsao_conclusao) &&
                    new Date(os.prazo_orcamento ?? os.data_previsao_conclusao).getTime() < Date.now();
                  return (
                    <li
                      key={os.id}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 ${corParado(dias)} ${semResponsavel(os) ? "bg-amber-50/60" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground">
                          {os.numero_os ?? "OS"}
                          {atrasada && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-red-600">
                              <AlertTriangle className="h-3 w-3" /> Atrasada
                            </span>
                          )}
                        </p>
                        <p className="truncate text-[11px] font-bold text-muted-foreground">
                          {os.cliente || "Sem cliente"} · {nomeResponsavel(os)} ·{" "}
                          {FALTA_DA_FASE[fase] ?? "Em andamento"} · {dias} dia(s)
                        </p>
                      </div>
                      <Button asChild size="sm" variant="ghost" className="shrink-0 text-[10px] font-black uppercase text-primary">
                        <Link to="/os/$id" params={{ id: String(os.id) }}>
                          Abrir OS
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
