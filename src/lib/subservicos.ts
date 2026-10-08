import { supabase } from "@/integrations/supabase/client";

/** Linha de serviço necessário no laudo — vira subserviço ao finalizar o diagnóstico. */
export interface LinhaServico {
  componente: string;
  descricao: string;
  checklist_item_id?: string | null;
  origem: "checklist" | "manual";
}

export const ESTADOS_RUINS = ["ruim", "danificado", "substituir", "recuperacao"];
export const LIMITE_OBS = 25;

export const STATUS_SUB = {
  aguardando: "Aguardando",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  enviado: "Com terceiro",
  concluido: "Concluído",
} as const;
export type StatusSub = keyof typeof STATUS_SUB;

export const encurtar = (txt: string, max = LIMITE_OBS) => {
  const t = String(txt ?? "").trim();
  return t.length > max ? `${t.slice(0, max)}...` : t;
};

export const itemRuim = (item: any) =>
  ESTADOS_RUINS.includes(String(item?.status ?? item?.estado_atual ?? item?.estado ?? "").toLowerCase());

/** Itens marcados como ruim no checklist → linhas de serviço. */
export function linhasDoChecklist(checklist: any[]): LinhaServico[] {
  return checklist.filter(itemRuim).map((i) => ({
    componente: String(i.item ?? i.item_peca ?? i.componente ?? "Item"),
    descricao: encurtar(i.observacao ?? i.observacao_tecnica ?? ""),
    checklist_item_id: i.id && !String(i.id).startsWith("tpl") ? i.id : null,
    origem: "checklist",
  }));
}

/** Texto de defeitos derivado do checklist. */
export function defeitosDoChecklist(checklist: any[]): string {
  return linhasDoChecklist(checklist)
    .map((l) => `• ${l.componente}${l.descricao ? ` — ${l.descricao}` : ""}`)
    .join("\n");
}

export const formatarLinha = (l: LinhaServico) =>
  `${l.componente}${l.descricao ? ` --- ${l.descricao}` : ""}`;

export const serializarLinhas = (linhas: LinhaServico[]) =>
  linhas.filter((l) => l.componente.trim()).map(formatarLinha).join("\n");

/** Converte o texto salvo no laudo de volta em linhas editáveis. */
export function parseLinhas(texto: string): LinhaServico[] {
  return String(texto ?? "")
    .split("\n")
    .map((l) => l.replace(/^[•\-\s]+/, "").trim())
    .filter(Boolean)
    .map((l) => {
      const [comp, ...resto] = l.split(" --- ");
      return { componente: comp.trim(), descricao: resto.join(" --- ").trim(), origem: "manual" as const };
    });
}

/** Cria os subserviços que ainda não existem para a OS. */
export async function criarSubservicos(osId: string, linhas: LinhaServico[], criadoPor?: string | null) {
  const { data: existentes, error: e1 } = await supabase
    .from("os_subservicos" as any)
    .select("componente, descricao")
    .eq("os_id", osId);
  if (e1) throw e1;
  const chave = (c: string, d: string) => `${c}`.toLowerCase().trim() + "|" + `${d}`.toLowerCase().trim();
  const ja = new Set((existentes ?? []).map((s: any) => chave(s.componente ?? "", s.descricao ?? "")));
  const novos = linhas
    .filter((l) => l.componente.trim())
    .filter((l) => !ja.has(chave(l.componente, l.descricao || l.componente)))
    .map((l, i) => ({
      os_id: osId,
      componente: l.componente.trim(),
      descricao: (l.descricao || l.componente).trim(),
      origem: l.origem,
      checklist_item_id: l.checklist_item_id ?? null,
      ordem_fila: i,
      criado_por: criadoPor ?? null,
    }));
  if (novos.length === 0) return 0;
  const { error } = await supabase.from("os_subservicos" as any).insert(novos);
  if (error) throw error;
  return novos.length;
}

export const subAberto = (s: any) => s?.status !== "concluido";
