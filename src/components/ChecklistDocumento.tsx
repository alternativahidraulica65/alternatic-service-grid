import { ArrowRight, Circle, Cog, Cylinder, Link2, Nut, Wrench, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function iconeComponente(nome: string): LucideIcon {
  const text = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/haste/.test(text)) return ArrowRight;
  if (/cilindro|camisa|embolo|pistao/.test(text)) return Cylinder;
  if (/vedacao|anel|retentor/.test(text)) return Circle;
  if (/parafuso|porca|rosca/.test(text)) return Nut;
  if (/olhal|conexao|mangueira/.test(text)) return Link2;
  if (/bomba|motor|engrenagem/.test(text)) return Cog;
  return Wrench;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroOs: string;
  cliente: string;
  equipamento: string;
  itens: { id: string; item: string; status: string; observacao?: string }[];
  assinatura: string;
  data: string | null;
}

export function ChecklistDocumento({ open, onOpenChange, numeroOs, cliente, equipamento, itens, assinatura, data }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto p-4 sm:p-8">
        <DialogHeader><DialogTitle>Checklist técnico · OS {numeroOs}</DialogTitle></DialogHeader>
        <article className="mt-4 space-y-6 text-foreground">
          <header className="border-b-2 border-primary pb-4">
            <h2 className="text-lg font-bold">Alternativa Hidráulica</h2>
            <p className="mt-2 text-sm">{cliente}</p>
            <p className="text-sm text-muted-foreground">{equipamento}</p>
            {data && <p className="mt-2 text-xs text-muted-foreground">Finalizado em {new Date(data).toLocaleString("pt-BR")}</p>}
          </header>
          <div className="divide-y divide-border">
            {itens.map((item) => {
              const Icon = iconeComponente(item.item || "");
              return <div key={item.id} className="grid grid-cols-[1fr_auto] gap-2 py-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-semibold"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" />{item.item}</span>
                <span className={item.status === "Bom" || item.status === "Aprovado" ? "font-semibold" : "font-semibold text-destructive"}>{item.status}</span>
                {item.observacao && <p className="col-span-2 break-words text-xs text-muted-foreground">{item.observacao}</p>}
              </div>;
            })}
          </div>
          <footer className="pt-8 text-center">
            <p className="checklist-signature break-words text-4xl">{assinatura || "Responsável não identificado"}</p>
            <p className="mx-auto mt-3 max-w-xs border-t border-border pt-2 text-xs text-muted-foreground">Responsável pela avaliação técnica</p>
          </footer>
        </article>
      </DialogContent>
    </Dialog>
  );
}