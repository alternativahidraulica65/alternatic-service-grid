/** Regras de custo homem-hora: salário + 65% de encargos ÷ 220h mensais. */
export const ENCARGOS = 0.65;
export const HORAS_MES = 220;
export const HORAS_GESTOR = 2;
const INICIO = 7, FIM = 17, ALMOCO_INI = 12, ALMOCO_FIM = 13;

export const custoHora = (salario: number) => Math.round(((salario * (1 + ENCARGOS)) / HORAS_MES) * 100) / 100;

/** Horas úteis (seg–sex, 07h–17h, sem almoço 12h–13h) entre duas datas; noites e fins de semana ignorados. */
export function horasUteis(inicio?: string | Date | null, fim?: string | Date | null): number {
  if (!inicio) return 0;
  const a = new Date(inicio), b = fim ? new Date(fim) : new Date();
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return 0;
  let total = 0;
  const dia = new Date(a); dia.setHours(0, 0, 0, 0);
  while (dia <= b) {
    const dow = dia.getDay();
    if (dow >= 1 && dow <= 5) {
      for (const [h1, h2] of [[INICIO, ALMOCO_INI], [ALMOCO_FIM, FIM]]) {
        const s = new Date(dia); s.setHours(h1!, 0, 0, 0);
        const e = new Date(dia); e.setHours(h2!, 0, 0, 0);
        const ini = Math.max(s.getTime(), a.getTime()), fi = Math.min(e.getTime(), b.getTime());
        if (fi > ini) total += (fi - ini) / 3600000;
      }
    }
    dia.setDate(dia.getDate() + 1);
  }
  return Math.round(total * 10) / 10;
}

/** ID estável por OS + pessoa + papel: evita linhas duplicadas de mão de obra. */
export async function idMaoDeObra(osId: string, usuarioId: string, papel: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`mao-obra:${osId}:${usuarioId}:${papel}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
