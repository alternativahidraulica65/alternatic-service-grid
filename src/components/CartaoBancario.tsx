import { Wallet } from "lucide-react";

type Marca = { sigla: string; nome: string; cor: string; cor2: string; texto: string };

// Identidade visual por instituição (cores oficiais aproximadas)
const MARCAS: { chaves: string[]; marca: Marca }[] = [
  { chaves: ["sicoob", "cocre"], marca: { sigla: "SICOOB", nome: "Sicoob", cor: "#003641", cor2: "#00AE9D", texto: "#C9D200" } },
  { chaves: ["sicredi"], marca: { sigla: "SICREDI", nome: "Sicredi", cor: "#1F5C2E", cor2: "#3FA110", texto: "#FFFFFF" } },
  { chaves: ["itau", "itaú"], marca: { sigla: "itaú", nome: "Itaú", cor: "#EC7000", cor2: "#003399", texto: "#FFE600" } },
  { chaves: ["bradesco"], marca: { sigla: "bradesco", nome: "Bradesco", cor: "#CC092F", cor2: "#5C0016", texto: "#FFFFFF" } },
  { chaves: ["santander"], marca: { sigla: "Santander", nome: "Santander", cor: "#EC0000", cor2: "#6B0000", texto: "#FFFFFF" } },
  { chaves: ["banco do brasil", "bb"], marca: { sigla: "BB", nome: "Banco do Brasil", cor: "#003DA5", cor2: "#001E5A", texto: "#FAE128" } },
  { chaves: ["caixa economica", "caixa econômica", "cef"], marca: { sigla: "CAIXA", nome: "Caixa", cor: "#005CA9", cor2: "#002B55", texto: "#F39200" } },
  { chaves: ["inter"], marca: { sigla: "inter", nome: "Inter", cor: "#FF7A00", cor2: "#8A3A00", texto: "#FFFFFF" } },
  { chaves: ["nubank", "nu "], marca: { sigla: "nu", nome: "Nubank", cor: "#820AD1", cor2: "#3A0560", texto: "#FFFFFF" } },
  { chaves: ["c6"], marca: { sigla: "C6", nome: "C6 Bank", cor: "#242424", cor2: "#000000", texto: "#FFFFFF" } },
  { chaves: ["safra"], marca: { sigla: "SAFRA", nome: "Safra", cor: "#0D2240", cor2: "#000814", texto: "#C8A45C" } },
  { chaves: ["btg"], marca: { sigla: "BTG", nome: "BTG Pactual", cor: "#0B2A4A", cor2: "#030E1A", texto: "#FFFFFF" } },
  { chaves: ["mercado pago"], marca: { sigla: "MP", nome: "Mercado Pago", cor: "#009EE3", cor2: "#00447A", texto: "#FFFFFF" } },
];

export function detectarBanco(...textos: (string | null | undefined)[]): Marca | null {
  const t = ` ${textos.filter(Boolean).join(" ").toLowerCase()} `;
  for (const m of MARCAS) if (m.chaves.some((k) => t.includes(k.length <= 3 ? ` ${k.trim()} ` : k))) return m.marca;
  return null;
}

type Props = {
  nome: string; banco?: string | null; agencia?: string | null; conta?: string | null;
  saldo: number; rodape: string; brl: (n: number) => string;
};

export function CartaoBancario({ nome, banco, agencia, conta, saldo, rodape, brl }: Props) {
  const m = detectarBanco(banco, nome);
  const caixa = !banco;
  const cor = m?.cor ?? "#2A2D33";
  const cor2 = m?.cor2 ?? "#0E0F12";
  const destaque = m?.texto ?? "#FFD700";
  const sigla = m?.sigla ?? (caixa ? "CAIXA" : (banco || nome).slice(0, 10).toUpperCase());

  return (
    <div
      className="relative aspect-[1.586] w-full overflow-hidden rounded-xl p-5 text-white shadow-2xl ring-1 ring-white/10 transition-transform hover:-translate-y-1"
      style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor2} 100%)` }}
    >
      {/* textura e brilho */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 7px)" }} />
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      {/* marca d'água */}
      <span className="pointer-events-none absolute -bottom-6 -right-2 select-none text-[7rem] font-black leading-none tracking-tighter opacity-[0.08]">
        {caixa ? "R$" : sigla}
      </span>

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          {caixa ? (
            <Wallet className="h-8 w-8" style={{ color: destaque }} />
          ) : (
            <div className="h-8 w-11 rounded-md shadow-inner" style={{ background: "linear-gradient(135deg,#E8C66A,#A9822E 55%,#F1D98B)" }}>
              <div className="m-1.5 h-5 rounded-sm border border-black/25" style={{ backgroundImage: "linear-gradient(90deg,transparent 45%,rgba(0,0,0,.25) 45% 55%,transparent 55%),linear-gradient(0deg,transparent 45%,rgba(0,0,0,.25) 45% 55%,transparent 55%)" }} />
            </div>
          )}
          <span className="max-w-[60%] truncate text-xl font-black tracking-tight" style={{ color: destaque }}>{sigla}</span>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Saldo atual</p>
          <p className={`text-3xl font-black tracking-tight ${saldo < 0 ? "text-red-300" : ""}`}>{brl(saldo)}</p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase">{nome}</p>
            <p className="font-mono text-[11px] text-white/70">
              {caixa ? "Caixa interno" : [agencia && `AG ${agencia}`, conta && `CC ${conta}`].filter(Boolean).join("  ·  ") || m?.nome || banco}
            </p>
          </div>
          <p className="shrink-0 text-right text-[9px] uppercase leading-tight text-white/50">{rodape}</p>
        </div>
      </div>
    </div>
  );
}
