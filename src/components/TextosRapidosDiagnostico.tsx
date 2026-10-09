import { Button } from "@/components/ui/button";

// Textos pré-configurados (máx. 4) para diagnóstico rápido no laudo técnico — ramo hidráulico.
const TEXTOS_RAPIDOS: { label: string; texto: string }[] = [
  {
    label: "Desgaste dos itens",
    texto:
      "Foi constatado desgaste excessivo nos componentes internos do equipamento, comprometendo o desempenho hidráulico. Recomenda-se a recuperação ou substituição das peças afetadas.",
  },
  {
    label: "Vazamento interno",
    texto:
      "Identificado vazamento interno entre as câmaras do cilindro, provavelmente causado por vedações desgastadas (retentores/anéis). Necessária a substituição do kit de vedações.",
  },
  {
    label: "Vazamento externo",
    texto:
      "Verificado vazamento externo pelo cabeçote, com perda de óleo durante a operação. Vedações comprometidas e possível avaria na superfície da haste.",
  },
  {
    label: "Haste com riscos",
    texto:
      "Haste apresentando riscos superficiais e pontos de corrosão, o que pode danificar as vedações durante o uso. Recomenda-se retífica e nova cromagem da haste.",
  },
];

export function TextosRapidosDiagnostico({ onSelecionar }: { onSelecionar: (texto: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mr-1">
        Inserir rápido:
      </span>
      {TEXTOS_RAPIDOS.map((t) => (
        <Button
          key={t.label}
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px] font-semibold text-slate-600 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900"
          title={t.texto}
          onClick={() => onSelecionar(t.texto)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
