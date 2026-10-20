import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Estados padronizados de listas: vazio, carregando e erro de rede. */
export function EstadoVazio({ titulo, descricao, icone, acao }: { titulo: string; descricao?: string; icone?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-8 text-center animate-in fade-in duration-300">
      <div className="text-muted-foreground">{icone ?? <Inbox className="h-8 w-8" />}</div>
      <p className="text-sm font-bold uppercase tracking-wider">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      {acao}
    </div>
  );
}

export function EstadoCarregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {texto}
    </div>
  );
}

export function EstadoErro({ mensagem, onTentar }: { mensagem?: string; onTentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center animate-in fade-in duration-300">
      <AlertTriangle className="h-7 w-7 text-destructive" />
      <p className="text-sm font-bold">Não foi possível carregar.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {mensagem || "A conexão oscilou. Verifique a internet e tente de novo."}
      </p>
      {onTentar && (
        <Button variant="outline" className="h-11 gap-2" onClick={onTentar}>
          <RefreshCw className="h-4 w-4" /> Tentar de novo
        </Button>
      )}
    </div>
  );
}

/** Traduz erros técnicos em mensagem curta para o usuário. */
export function mensagemErro(erro: unknown): string {
  const msg = (erro as any)?.message ? String((erro as any).message) : String(erro ?? "");
  if (/fetch|network|Failed to fetch|timeout/i.test(msg)) return "Sem conexão no momento. Tente de novo em instantes.";
  if (/permission|policy|row-level/i.test(msg)) return "Você não tem permissão para esta ação.";
  return msg || "Algo deu errado. Tente de novo.";
}
