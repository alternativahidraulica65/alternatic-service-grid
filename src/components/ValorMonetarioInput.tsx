import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

export function parseValorMonetario(text: string): number {
  const cleaned = text.trim().replace(/R\$|\s/g, '');
  if (!cleaned) return 0;
  if (!/^[\d.,]+$/.test(cleaned)) return NaN;
  return Number(cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned);
}

const formatar = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  label: string;
}

export function ValorMonetarioInput({ value, onChange, onCommit, label }: Props) {
  const [text, setText] = useState(formatar(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(formatar(value)); }, [value]);
  return <div>
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input aria-label={label} aria-invalid={invalid} inputMode="decimal" type="text"
        className="h-11 bg-background pl-10 text-right text-base font-semibold tabular-nums"
        value={text} onFocus={(event) => event.target.select()}
        onChange={(event) => { setText(event.target.value); setInvalid(false); }}
        onBlur={() => {
          const next = parseValorMonetario(text);
          if (!Number.isFinite(next) || next < 0) { setInvalid(true); return; }
          const rounded = Math.round(next * 100) / 100;
          setText(formatar(rounded)); onChange(rounded); onCommit?.(rounded);
        }} />
    </div>
    {invalid && <p className="mt-1 text-xs text-destructive">Informe um valor válido.</p>}
  </div>;
}