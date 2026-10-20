import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type EnderecoFiscal, pendenciasEndereco } from "@/lib/fiscal";
import { consultarCep } from "@/lib/brasilapi";

type Props = {
  valor: EnderecoFiscal;
  onChange: (v: EnderecoFiscal) => void;
};

function C({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`grid gap-1.5 ${className || ""}`}>
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Endereço estruturado exigido pelo fisco (NF-e / NFS-e), com busca por CEP. */
export function EnderecoFiscalCampos({ valor, onChange }: Props) {
  const [buscando, setBuscando] = useState(false);
  const set = (k: keyof EnderecoFiscal, v: string) => onChange({ ...valor, [k]: v });
  const faltando = pendenciasEndereco(valor);

  const buscarCep = async () => {
    setBuscando(true);
    try {
      const d = await consultarCep(valor.cep);
      onChange({
        ...valor,
        cep: d.cep,
        logradouro: d.logradouro || valor.logradouro,
        bairro: d.bairro || valor.bairro,
        cidade: d.cidade || valor.cidade,
        uf: d.uf || valor.uf,
        codigo_ibge: d.codigo_ibge || valor.codigo_ibge,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-3 rounded-md border border-border p-3">
      <div className="col-span-6 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest">Endereço fiscal</span>
        {faltando.length === 0 ? (
          <span className="text-[10px] font-bold uppercase text-emerald-600">Completo</span>
        ) : (
          <span className="text-[10px] font-bold uppercase text-destructive">Falta: {faltando.join(", ")}</span>
        )}
      </div>
      <C label="CEP" className="col-span-3 sm:col-span-2">
        <div className="flex gap-1">
          <Input value={valor.cep} onChange={(e) => set("cep", e.target.value)} className="font-mono" placeholder="00000-000" />
          <Button type="button" variant="outline" size="icon" onClick={buscarCep} disabled={buscando} aria-label="Buscar CEP">
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </C>
      <C label="Logradouro" className="col-span-6 sm:col-span-4">
        <Input value={valor.logradouro} onChange={(e) => set("logradouro", e.target.value)} />
      </C>
      <C label="Número" className="col-span-2">
        <Input value={valor.numero} onChange={(e) => set("numero", e.target.value)} placeholder="S/N" />
      </C>
      <C label="Complemento" className="col-span-4">
        <Input value={valor.complemento} onChange={(e) => set("complemento", e.target.value)} />
      </C>
      <C label="Bairro" className="col-span-6 sm:col-span-3">
        <Input value={valor.bairro} onChange={(e) => set("bairro", e.target.value)} />
      </C>
      <C label="Cidade" className="col-span-4 sm:col-span-2">
        <Input value={valor.cidade} onChange={(e) => set("cidade", e.target.value)} />
      </C>
      <C label="UF" className="col-span-2 sm:col-span-1">
        <Input value={valor.uf} maxLength={2} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
      </C>
      <C label="Código IBGE da cidade" className="col-span-6 sm:col-span-3">
        <Input value={valor.codigo_ibge} onChange={(e) => set("codigo_ibge", e.target.value)} className="font-mono" placeholder="7 dígitos" />
      </C>
    </div>
  );
}
