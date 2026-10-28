// Regras financeiras puras (sem acesso a banco) — testáveis.

/** Teto anual de faturamento por regime (Simples Nacional). */
export const TETO_ME = 360_000;
export const TETO_EPP = 4_800_000;

export function tetoDoRegime(regime?: string | null): { teto: number; rotulo: string } {
  const r = (regime || "").toLowerCase();
  if (r.includes("mei")) return { teto: 81_000, rotulo: "MEI" };
  if (r.includes("epp")) return { teto: TETO_EPP, rotulo: "EPP" };
  return { teto: TETO_ME, rotulo: "ME" };
}

/** "30/60 DDL" -> [30, 60]; "À vista" -> [0]. Espelha public.parse_prazos_pagamento. */
export function parsePrazos(texto?: string | null): number[] {
  const m = [...(texto || "").matchAll(/(\d{1,3})(?=\s*(\/|,|ddl|dias|dd|$|\s+e\s))/gi)].map((x) => Number(x[1]));
  return m.length ? m : [0];
}

export function somarDiasIso(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function addMesesIso(iso: string, meses: number): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + meses, 1, 12));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0, 12)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

/** Vencimentos das parcelas a partir da data de emissão da nota. */
export function vencimentosDaNota(emissaoIso: string, condicao?: string | null): string[] {
  return parsePrazos(condicao).map((p) => somarDiasIso(emissaoIso, p));
}
