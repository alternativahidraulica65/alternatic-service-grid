import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const STATUS_FINALIZADOS_OS = ["entregue", "encerrada", "faturada", "cancelada"];

export function getPrazoOs(o: any): string | null {
  return o?.prazo_orcamento ?? o?.data_previsao_conclusao ?? null;
}

export function isOsAtrasada(o: any, agora: number = Date.now()): boolean {
  if (STATUS_FINALIZADOS_OS.includes(String(o?.status))) return false;
  const prazo = getPrazoOs(o);
  return prazo ? new Date(prazo).getTime() < agora : false;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ordens: any[];
}

export function OsAtrasadasDialog({ open, onOpenChange, ordens }: Props) {
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const agora = Date.now();
    return (ordens ?? [])
      .filter((o) => isOsAtrasada(o, agora))
      .map((o) => {
        const prazo = getPrazoOs(o)!;
        const dias = Math.max(1, Math.floor((agora - new Date(prazo).getTime()) / 86400000));
        return { ...o, _prazo: prazo, _dias: dias };
      })
      .filter((o) => {
        const t = busca.trim().toLowerCase();
        if (!t) return true;
        return [o.numero_os, o.cliente, o.descricao, o.status]
          .filter(Boolean)
          .some((v: any) => String(v).toLowerCase().includes(t));
      })
      .sort((a, b) => b._dias - a._dias);
  }, [ordens, busca]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            OS Atrasadas ({lista.length})
          </DialogTitle>
          <DialogDescription>
            Ordens de serviço em aberto com prazo vencido.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar por OS, cliente ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="space-y-2">
          {lista.length === 0 && (
            <div className="py-8 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Nenhuma OS atrasada
            </div>
          )}
          {lista.map((o) => (
            <Link
              key={o.id}
              to="/os/$id"
              params={{ id: String(o.id) }}
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-red-800">
                  {o.numero_os ?? "OS"} — {o.cliente ?? "Sem cliente"}
                </p>
                <p className="text-xs text-red-600 truncate">
                  {o.descricao || "Sem descrição"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Prazo: {new Date(o._prazo).toLocaleDateString("pt-BR")} · atrasada há {o._dias} dia(s)
                </p>
              </div>
              <Badge variant="secondary" className="text-[9px] uppercase shrink-0">
                {String(o.status ?? "—")}
              </Badge>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
