import { Plus, Trash2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LIMITE_OBS, type LinhaServico } from "@/lib/subservicos";

interface Props {
  linhas: LinhaServico[];
  onChange: (linhas: LinhaServico[]) => void;
}

export function ServicosLaudoEditor({ linhas, onChange }: Props) {
  const atualizar = (i: number, campo: "componente" | "descricao", valor: string) =>
    onChange(linhas.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));

  return (
    <div className="space-y-2">
      {linhas.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhum item "Ruim" no checklist. Adicione os serviços manualmente.
        </p>
      )}
      {linhas.map((l, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          {l.origem === "checklist" ? (
            <Badge variant="outline" className="shrink-0 gap-1 text-[9px] uppercase" title="Veio do checklist">
              <ClipboardCheck className="h-3 w-3" /> Checklist
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 text-[9px] uppercase">Manual</Badge>
          )}
          <Input
            value={l.componente}
            onChange={(e) => atualizar(i, "componente", e.target.value)}
            placeholder="Componente / serviço"
            className="h-8 w-1/3 text-sm font-semibold"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            value={l.descricao}
            maxLength={LIMITE_OBS + 3}
            onChange={(e) => atualizar(i, "descricao", e.target.value)}
            placeholder="Observação (ex: Riscada)"
            className="h-8 flex-1 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Remover linha"
            onClick={() => onChange(linhas.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 text-[10px] font-bold uppercase"
        onClick={() => onChange([...linhas, { componente: "", descricao: "", origem: "manual" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar serviço
      </Button>
    </div>
  );
}
