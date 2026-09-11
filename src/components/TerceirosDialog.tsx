import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Search, AlertTriangle, CheckCircle2, CalendarClock } from "lucide-react";

interface TerceirosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordens: any[];
}

const fmtData = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v.length <= 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR");
};

export function TerceirosDialog({ open, onOpenChange, ordens }: TerceirosDialogProps) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"pendentes" | "recebidos">("pendentes");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ["gestor_terceiros_pecas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_pecas_rastreio" as any)
        .select(
          "id, nome, os_id, status_peca, terceiro_nome, terceiro_prazo_entrega, terceiro_enviado_em, terceiro_recebido_em, terceiro_observacao, criado_em",
        )
        .eq("status_peca", "Terceiros")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const osMap = useMemo(() => {
    const map = new Map<string, any>();
    (ordens ?? []).forEach((o: any) => map.set(String(o.id), o));
    return map;
  }, [ordens]);

  const hoje = new Date().setHours(0, 0, 0, 0);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (pecas as any[])
      .map((p) => {
        const os = osMap.get(String(p.os_id));
        const prazo = p.terceiro_prazo_entrega
          ? new Date(`${String(p.terceiro_prazo_entrega).slice(0, 10)}T12:00:00`).getTime()
          : null;
        const atrasado = !p.terceiro_recebido_em && prazo !== null && prazo < hoje;
        return { peca: p, os, atrasado };
      })
      .filter(({ peca, os }) => {
        const recebido = !!peca.terceiro_recebido_em;
        if (aba === "pendentes" && recebido) return false;
        if (aba === "recebidos" && !recebido) return false;
        if (!termo) return true;
        return (
          String(peca.nome ?? "").toLowerCase().includes(termo) ||
          String(peca.terceiro_nome ?? "").toLowerCase().includes(termo) ||
          String(os?.numero_os ?? "").toLowerCase().includes(termo) ||
          String(os?.cliente ?? "").toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => Number(b.atrasado) - Number(a.atrasado));
  }, [pecas, osMap, busca, aba, hoje]);

  const pendentesCount = (pecas as any[]).filter((p) => !p.terceiro_recebido_em).length;

  const salvarCampo = async (pecaId: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("os_pecas_rastreio" as any).update(updates).eq("id", pecaId);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["gestor_terceiros_pecas"] });
    toast.success("Dados do terceiro atualizados");
  };

  const registrarRecebimento = async (peca: any, os: any) => {
    setSalvandoId(peca.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      const agora = new Date().toISOString();

      const { error } = await supabase
        .from("os_pecas_rastreio" as any)
        .update({
          terceiro_recebido_em: agora,
          terceiro_recebido_por: userId,
          status_peca: "Recebido de Terceiros",
        })
        .eq("id", peca.id);
      if (error) throw error;

      const statusOs = String(os?.status ?? "");
      await supabase.from("historico_status_os" as any).insert({
        os_id: peca.os_id,
        status_anterior: statusOs || null,
        status_novo: statusOs || "em_andamento",
        observacao: `Baixa de terceiros: peça "${peca.nome ?? "Peça"}" recebida de ${
          peca.terceiro_nome || "terceiro não informado"
        }.`,
        executor_id: userId,
      });

      queryClient.invalidateQueries({ queryKey: ["gestor_terceiros_pecas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_pecas_todas"] });
      toast.success("Recebimento registrado e gravado no histórico da OS");
    } catch (e: any) {
      toast.error("Erro ao registrar recebimento: " + e.message);
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Serviços em Terceiros
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Tudo que está fora da empresa: peça, OS, terceiro responsável e prazo prometido. Dê baixa ao receber.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              placeholder="Peça, terceiro, OS ou cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant={aba === "pendentes" ? "default" : "outline"}
            className="h-8 text-[10px] font-black uppercase"
            onClick={() => setAba("pendentes")}
          >
            Pendências ({pendentesCount})
          </Button>
          <Button
            size="sm"
            variant={aba === "recebidos" ? "default" : "outline"}
            className="h-8 text-[10px] font-black uppercase"
            onClick={() => setAba("recebidos")}
          >
            Recebidos
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading && <p className="text-xs text-muted-foreground py-4 text-center">Carregando...</p>}
          {!isLoading && itens.length === 0 && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-8 text-center">
              {aba === "pendentes" ? "Nenhuma peça em terceiros no momento" : "Nenhum recebimento registrado"}
            </p>
          )}

          {itens.map(({ peca, os, atrasado }) => (
            <div
              key={peca.id}
              className={`rounded-lg border p-3 space-y-3 ${
                atrasado ? "border-red-200 bg-red-50/40" : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase truncate">{peca.nome ?? "Peça"}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                    {os ? (
                      <Link
                        to="/os/$id"
                        params={{ id: String(peca.os_id) }}
                        className="underline hover:text-primary"
                      >
                        {os.numero_os ?? "OS"}
                      </Link>
                    ) : (
                      <span>OS não encontrada</span>
                    )}
                    <span className="normal-case font-medium truncate">{os?.cliente ?? "Sem cliente"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {atrasado && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] font-black uppercase gap-1">
                      <AlertTriangle className="h-3 w-3" /> Prazo vencido
                    </Badge>
                  )}
                  {peca.terceiro_recebido_em ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Recebido em {fmtData(peca.terceiro_recebido_em)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] font-black uppercase gap-1">
                      <CalendarClock className="h-3 w-3" /> Fora da empresa
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                <Input
                  className="h-8 text-xs sm:col-span-1"
                  placeholder="Terceiro responsável"
                  defaultValue={peca.terceiro_nome ?? ""}
                  disabled={!!peca.terceiro_recebido_em}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== (peca.terceiro_nome ?? "")) salvarCampo(peca.id, { terceiro_nome: val || null });
                  }}
                />
                <div className="sm:col-span-1">
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    title="Prazo prometido pelo terceiro"
                    defaultValue={peca.terceiro_prazo_entrega ? String(peca.terceiro_prazo_entrega).slice(0, 10) : ""}
                    disabled={!!peca.terceiro_recebido_em}
                    onChange={(e) =>
                      salvarCampo(peca.id, {
                        terceiro_prazo_entrega: e.target.value || null,
                        terceiro_enviado_em: peca.terceiro_enviado_em ?? new Date().toISOString(),
                      })
                    }
                  />
                </div>
                <Input
                  className="h-8 text-xs sm:col-span-1"
                  placeholder="Observação (serviço, contato...)"
                  defaultValue={peca.terceiro_observacao ?? ""}
                  disabled={!!peca.terceiro_recebido_em}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== (peca.terceiro_observacao ?? ""))
                      salvarCampo(peca.id, { terceiro_observacao: val || null });
                  }}
                />
                {peca.terceiro_recebido_em ? (
                  <p className="text-[10px] font-bold uppercase text-muted-foreground self-center">
                    Enviado em {fmtData(peca.terceiro_enviado_em) ?? "—"} · Prazo{" "}
                    {fmtData(peca.terceiro_prazo_entrega) ?? "—"}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 text-[10px] font-black uppercase"
                    disabled={salvandoId === peca.id}
                    onClick={() => registrarRecebimento(peca, os)}
                  >
                    {salvandoId === peca.id ? "Registrando..." : "Registrar recebimento"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
