/**
 * A coluna os_id nas tabelas oficiais (historico_status_os, os_checklist_tecnico,
 * os_custos, os_pecas_rastreio, fotos_anexos) é INTEGER.
 * Nunca envie UUID/String para essas colunas.
 */
export function toOsId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(n) ? n : null;
}
