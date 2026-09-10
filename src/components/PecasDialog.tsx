import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Search, AlertTriangle } from "lucide-react";

export const STATUS_FINALIZADOS = ["entregue", "encerrada", "faturada", "cancelada"];

interface PecasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordens: any[];
}

export function PecasDialog({ open, onOpenChange, ordens }: PecasDialogProps) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [osFiltro, setOsFiltro] = useState("todas");
  const [atrasoFiltro, setAtrasoFiltro] = useState("todas");

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ["gestor_pecas_os_abertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_pecas_rastreio" as any)
        .select("id, nome, os_id, status_peca, localizacao, localizacao_fisica, bancada_id, aprovado_gestor, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const agora = Date.now();

  const osAbertas = useMemo(() => {
    const map = new Map<string, any>();
    (ordens ?? []).forEach((o: any) => {
      if (STATUS_FINALIZADOS.includes(String(o.status))) return;
      const prazo = o.prazo_orcamento ?? o.data_previsao_conclusao;
      map.set(String(o.id), {
        ...o,
        atrasada: prazo ? new Date(prazo).getTime() < agora : false,
      });
    });
    return map;
  }, [ordens, agora]);

  const itens = useMemo(() => {
    return (pecas as any[])
      .map((p: any) => ({ peca: p, os: osAbertas.get(String(p.os_id)) }))
      .filter((r) => !!r.os);
  }, [pecas, osAbertas]);

  const statusDisponiveis = useMemo(() => {
    const set = new Set<string>();
    itens.forEach((r) => set.add(String(r.peca.status_peca ?? "Pendente de Destinação")));
    return Array.from(set).sort();
  }, [itens]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter(({ peca, os }) => {
      const status = String(peca.status_peca ?? "Pendente de Destinação");
      if (statusFiltro !== "todos" && status !== statusFiltro) return false;
      if (osFiltro !== "todas" && String(peca.os_id) !== osFiltro) return false;
      if (atrasoFiltro === "atrasadas" && !os.atrasada) return false;
      if (atrasoFiltro === "no_prazo" && os.atrasada) return false;
      if (!termo) return true;
      return (
        String(peca.nome ?? "").toLowerCase().includes(termo) ||
        String(os.numero_os ?? "").toLowerCase().includes(termo) ||
        String(os.cliente ?? "").toLowerCase().includes(termo)
      );
    });
  }, [itens, busca, statusFiltro, osFiltro, atrasoFiltro]);

  const osComPecas = useMemo(() => {
    const ids = new Set(itens.map((r) => String(r.peca.os_id)));
    return Array.from(ids)
      .map((id) => osAbertas.get(id))
      .filter(Boolean);
  }, [itens, osAbertas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">
            Peças das OS Abertas
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Todas as peças rastreadas em ordens de serviço em andamento, incluindo as atrasadas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              placeholder="Peça, OS ou cliente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="h-8 text-[10px] font-bold uppercase">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos os status</SelectItem>
              {statusDisponiveis.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={osFiltro} onValueChange={setOsFiltro}>
            <SelectTrigger className="h-8 text-[10px] font-bold uppercase">
              <SelectValue placeholder="OS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">Todas as OS</SelectItem>
              {osComPecas.map((o: any) => (
                <SelectItem key={o.id} value={String(o.id)} className="text-xs">
                  {o.numero_os ?? String(o.id).substring(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={atrasoFiltro} onValueChange={setAtrasoFiltro}>
            <SelectTrigger className="h-8 text-[10px] font-bold uppercase">
              <SelectValue placeholder="Prazo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">Todos os prazos</SelectItem>
              <SelectItem value="atrasadas" className="text-xs">Somente atrasadas</SelectItem>
              <SelectItem value="no_prazo" className="text-xs">Somente no prazo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {filtrados.length} peça(s) encontrada(s)
        </p>

        <div className="space-y-2">
          {isLoading && (
            <p className="text-xs text-muted-foreground py-4 text-center">Carregando peças...</p>
          )}
          {!isLoading && filtrados.length === 0 && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-6 text-center">
              Nenhuma peça encontrada
            </p>
          )}
          {filtrados.map(({ peca, os }) => (
            <div
              key={peca.id}
              className="rounded-lg border border-border p-3 flex items-center justify-between gap-3 bg-card"
            >
              <div className="min-w-0 flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{peca.nome ?? "Peça"}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                    <Link
                      to="/os/$id"
                      params={{ id: String(peca.os_id) }}
                      className="underline hover:text-primary"
                    >
                      {os.numero_os ?? "OS"}
                    </Link>
                    <span className="truncate normal-case font-medium">{os.cliente ?? "Sem cliente"}</span>
                    {(peca.localizacao_fisica || peca.localizacao) && (
                      <span className="normal-case font-medium">
                        {peca.localizacao_fisica || peca.localizacao}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {os.atrasada && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] font-black uppercase gap-1">
                    <AlertTriangle className="h-3 w-3" /> Atrasada
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[9px] font-black uppercase">
                  {peca.status_peca ?? "Pendente de Destinação"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
