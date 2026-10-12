import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HardHat, Save, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { horasUteis, HORAS_GESTOR, idMaoDeObra } from "@/lib/mao-de-obra";

type Papel = "operador" | "gestor" | "torneiro";
type Linha = { usuarioId: string; papel: Papel; horasSugeridas: number };
const ROTULO: Record<Papel, string> = { operador: "Operador", gestor: "Gestor", torneiro: "Torneiro" };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MaoDeObraOsCard({ osId }: { osId: string }) {
  const qc = useQueryClient();
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [gestorId, setGestorId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data } = useQuery({
    queryKey: ["mao_obra_base", osId],
    queryFn: async () => {
      const [os, hist, subs, usuarios, custos] = await Promise.all([
        supabase.from("ordens_servico").select("data_abertura, criado_em, data_entrega, tecnico_id, operador_atribuido").eq("id", osId).single(),
        supabase.from("historico_status_os").select("executor_id").eq("os_id", osId),
        supabase.from("os_subservicos" as any).select("operador_id, iniciado_em, concluido_em, status, bancadas(is_usinagem, usuario_id)").eq("os_id", osId),
        supabase.from("usuarios").select("id, user_id, nome, cargo").eq("ativo", true).order("nome"),
        supabase.from("os_custos" as any).select("*").eq("os_id", osId).eq("categoria", "mao_de_obra"),
      ]);
      if (os.error) throw os.error;
      return { os: os.data as any, hist: hist.data ?? [], subs: (subs.data ?? []) as any[], usuarios: (usuarios.data ?? []) as any[], custos: (custos.data ?? []) as any[] };
    },
  });

  const gestores = useMemo(() => (data?.usuarios ?? []).filter((u) => String(u.cargo ?? "").toLowerCase() === "gestor"), [data]);

  useEffect(() => {
    if (!data || gestorId) return;
    const salvo = data.custos.find((c) => c.mao_obra_papel === "gestor");
    const doHist = gestores.find((g) => data.hist.some((h: any) => h.executor_id === g.user_id));
    const g = salvo?.mao_obra_usuario_id ?? doHist?.id ?? "";
    if (g) setGestorId(g);
  }, [data, gestores, gestorId]);

  const linhas = useMemo<Linha[]>(() => {
    if (!data) return [];
    const out: Linha[] = [];
    const os = data.os;
    const opId = os.tecnico_id ?? data.usuarios.find((u) => u.user_id === os.operador_atribuido)?.id;
    if (opId) out.push({ usuarioId: opId, papel: "operador", horasSugeridas: horasUteis(os.data_abertura ?? os.criado_em, os.data_entrega) });
    if (gestorId) out.push({ usuarioId: gestorId, papel: "gestor", horasSugeridas: HORAS_GESTOR });
    const torno = new Map<string, number>();
    for (const s of data.subs) {
      if (!s.bancadas?.is_usinagem) continue;
      const uid = s.operador_id ?? s.bancadas?.usuario_id;
      if (!uid || !s.iniciado_em) continue;
      torno.set(uid, (torno.get(uid) ?? 0) + horasUteis(s.iniciado_em, s.concluido_em));
    }
    torno.forEach((h, uid) => out.push({ usuarioId: uid, papel: "torneiro", horasSugeridas: Math.round(h * 10) / 10 }));
    // Linhas já salvas que não vieram da sugestão continuam visíveis.
    for (const c of data.custos) {
      if (c.mao_obra_usuario_id && !out.some((l) => l.usuarioId === c.mao_obra_usuario_id && l.papel === c.mao_obra_papel))
        out.push({ usuarioId: c.mao_obra_usuario_id, papel: c.mao_obra_papel, horasSugeridas: Number(c.horas ?? 0) });
    }
    return out;
  }, [data, gestorId]);

  const ids = useMemo(() => Array.from(new Set(linhas.map((l) => l.usuarioId))), [linhas]);
  const { data: valores = [] } = useQuery({
    queryKey: ["custo_hora", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("custo_hora_usuarios" as any, { p_ids: ids });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const chave = (l: Linha) => `${l.usuarioId}:${l.papel}`;
  const salvoDe = (l: Linha) => data?.custos.find((c) => c.mao_obra_usuario_id === l.usuarioId && c.mao_obra_papel === l.papel);
  const horasDe = (l: Linha) => {
    const v = horas[chave(l)];
    if (v !== undefined) return Number(v.replace(",", ".")) || 0;
    const s = salvoDe(l);
    return s ? Number(s.horas ?? 0) : l.horasSugeridas;
  };
  const infoDe = (id: string) => valores.find((v) => v.usuario_id === id);
  const total = linhas.reduce((s, l) => s + horasDe(l) * Number(infoDe(l.usuarioId)?.custo_hora ?? 0), 0);

  async function salvar() {
    setSalvando(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const rows = [];
      for (const l of linhas) {
        const info = infoDe(l.usuarioId);
        const ch = Number(info?.custo_hora ?? 0);
        if (!ch) continue;
        const h = horasDe(l);
        const valor = Math.round(h * ch * 100) / 100;
        rows.push({
          id: await idMaoDeObra(osId, l.usuarioId, l.papel),
          os_id: osId, categoria: "mao_de_obra",
          descricao: `Mão de obra — ${ROTULO[l.papel]} ${info?.nome ?? ""} (${h.toLocaleString("pt-BR")}h × ${brl(ch)})`,
          custo_interno: valor, valor_venda: valor,
          mao_obra_usuario_id: l.usuarioId, mao_obra_papel: l.papel, horas: h, custo_hora: ch,
          criado_por: u.user?.id ?? null,
        });
      }
      if (!rows.length) { toast.error("Nenhum colaborador com salário cadastrado."); return; }
      const { error } = await supabase.from("os_custos" as any).upsert(rows, { onConflict: "id" });
      if (error) throw error;
      toast.success("Mão de obra lançada nos custos.");
      setHoras({});
      qc.invalidateQueries({ queryKey: ["mao_obra_base", osId] });
      qc.invalidateQueries({ queryKey: ["os_custos", osId] });
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(`Erro ao lançar mão de obra: ${e.message}`);
    } finally { setSalvando(false); }
  }

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <HardHat className="h-5 w-5 text-primary" />
        <h3 className="font-bold uppercase text-sm tracking-wide flex-1">Mão de obra (homem-hora)</h3>
        <span className="font-mono font-bold">{brl(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground">Salário + 65% de encargos ÷ 220h. Horas úteis seg–sex, 07h–17h (sem almoço e noite). Ajuste as horas reais antes de lançar.</p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-bold uppercase text-muted-foreground">Gestor responsável</span>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={gestorId} onChange={(e) => setGestorId(e.target.value)}>
          <option value="">— Nenhum —</option>
          {gestores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum operador, gestor ou torneiro vinculado a esta OS ainda.</p>
      ) : (
        <div className="space-y-2">
          {linhas.map((l) => {
            const info = infoDe(l.usuarioId);
            const ch = Number(info?.custo_hora ?? 0);
            const h = horasDe(l);
            const nome = info?.nome ?? data?.usuarios.find((u) => u.id === l.usuarioId)?.nome ?? "—";
            return (
              <div key={chave(l)} className="grid grid-cols-2 sm:grid-cols-[110px_1fr_110px_100px_120px] items-center gap-2 rounded-md border p-2 text-sm">
                <span className="text-xs font-bold uppercase text-primary">{ROTULO[l.papel]}</span>
                <span className="font-semibold truncate">{nome}</span>
                <span className="text-xs text-muted-foreground">{ch ? `${brl(ch)}/h` : <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />Sem salário no RH</span>}</span>
                <div className="flex items-center gap-1">
                  <Input className="h-9 w-20 text-right" inputMode="decimal" value={horas[chave(l)] ?? String(h).replace(".", ",")} onChange={(e) => setHoras({ ...horas, [chave(l)]: e.target.value })} />
                  <span className="text-xs">h</span>
                </div>
                <span className="font-mono font-bold text-right">{brl(h * ch)}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={salvar} disabled={salvando || linhas.length === 0}><Save className="h-4 w-4 mr-1" />{salvando ? "Lançando..." : "Lançar / atualizar mão de obra"}</Button>
      </div>
    </div>
  );
}
