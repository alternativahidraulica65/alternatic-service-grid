import { useEffect, useState } from "react";
import { getExecutorEmail } from "@/lib/log-executor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cog, UserCheck, CheckCircle2, Clock, Wrench, Pencil, Plus } from "lucide-react";
import { STATUS_FINALIZADOS } from "@/components/PecasDialog";

interface BancadasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordens: any[];
}

export function BancadasDialog({ open, onOpenChange, ordens }: BancadasDialogProps) {
  const queryClient = useQueryClient();
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<Record<string, boolean>>({});
  const [osSelecionada, setOsSelecionada] = useState<Record<string, string>>({});

  const { data: bancadas = [] } = useQuery({
    queryKey: ["bancadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bancadas" as any)
        .select("*")
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: fila = [] } = useQuery({
    queryKey: ["bancadas_fila"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_pecas_rastreio" as any)
        .select("id, nome, os_id, status_peca, bancada_id, aprovado_gestor, criado_em")
        .not("bancada_id", "is", null)
        .not("status_peca", "in", "(concluida,finalizada,entregue,cancelada)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const osPorId = new Map((ordens ?? []).map((o: any) => [String(o.id), o]));

  // Garante que qualquer peça marcada como "Refazer/Usinagem" sem bancada
  // entre automaticamente na fila da bancada de usinagem (A5) como pendente.
  useEffect(() => {
    const sincronizarUsinagem = async () => {
      const bancadaUsinagem = (bancadas as any[]).find((b: any) => b.is_usinagem);
      if (!bancadaUsinagem) return;
      const { data: pendentes, error } = await supabase
        .from("os_pecas_rastreio" as any)
        .select("id")
        .is("bancada_id", null)
        .ilike("status_peca", "refazer%usinagem%")
        .not("status_peca", "in", "(concluida,finalizada,entregue,cancelada)");
      if (error || !(pendentes ?? []).length) return;
      const { error: updError } = await supabase
        .from("os_pecas_rastreio" as any)
        .update({ bancada_id: (bancadaUsinagem as any).id, aprovado_gestor: false })
        .in("id", (pendentes as any[]).map((p: any) => p.id));
      if (!updError) {
        queryClient.invalidateQueries({ queryKey: ["bancadas_fila"] });
      }
    };
    if (open && (bancadas as any[]).length > 0) sincronizarUsinagem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (bancadas as any[]).length]);

  const salvarTecnico = async (bancada: any) => {
    const nome = (nomes[bancada.id] ?? bancada.tecnico_nome ?? "").trim();
    const { error } = await supabase
      .from("bancadas" as any)
      .update({ tecnico_nome: nome || null })
      .eq("id", bancada.id);
    if (error) {
      toast.error("Erro ao salvar técnico: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["bancadas"] });
    setEditando((prev) => ({ ...prev, [bancada.id]: false }));
    toast.success(`Técnico da ${bancada.codigo} atualizado`);
  };

  const osAbertas = (ordens ?? []).filter(
    (o: any) => !STATUS_FINALIZADOS.includes(String(o.status)),
  );

  const adicionarOs = async (bancada: any) => {
    const osId = osSelecionada[bancada.id];
    if (!osId) {
      toast.error("Selecione uma OS");
      return;
    }
    const os: any = osPorId.get(String(osId));
    const { error } = await supabase.from("os_pecas_rastreio" as any).insert({
      os_id: osId,
      nome: `Serviço ${os?.numero_os ?? "OS"}`,
      bancada_id: bancada.id,
      aprovado_gestor: false,
      status_peca: "Refazer / Usinagem",
    });
    if (error) {
      toast.error("Erro ao adicionar OS: " + error.message);
      return;
    }
    setOsSelecionada((prev) => ({ ...prev, [bancada.id]: "" }));
    queryClient.invalidateQueries({ queryKey: ["bancadas_fila"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_pecas_todas"] });
    toast.success(`OS adicionada à ${bancada.codigo}`);
  };

  const atualizarPeca = async (pecaId: string, updates: any, msg: string) => {
    const { error } = await supabase
      .from("os_pecas_rastreio" as any)
      .update(updates)
      .eq("id", pecaId);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["bancadas_fila"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_pecas_pendentes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_pecas_todas"] });
    toast.success(msg);
  };

  const darBaixa = async (peca: any) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      const os: any = osPorId.get(String(peca.os_id));

      const { error } = await supabase
        .from("os_pecas_rastreio" as any)
        .update({ status_peca: "concluida" })
        .eq("id", peca.id);
      if (error) throw error;

      const statusOs = String(os?.status ?? "");
      await supabase.from("historico_status_os" as any).insert({
        os_id: peca.os_id,
        status_anterior: statusOs || null,
        status_novo: statusOs || "em_andamento",
        observacao: `Baixa de usinagem: serviço "${peca.nome ?? "Peça"}" concluído na bancada.`,
        executor_id: userId,
        executor_email: await getExecutorEmail(),
      });

      queryClient.invalidateQueries({ queryKey: ["bancadas_fila"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_pecas_todas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_gestor_pecas_pendentes"] });
      toast.success("Baixa registrada e gravada no histórico da OS");
    } catch (e: any) {
      toast.error("Erro ao dar baixa: " + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">
            Bancadas da Oficina
          </DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Defina o técnico de cada bancada e libere os serviços da fila. Peças enviadas para
            usinagem entram automaticamente na bancada A5.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {(bancadas as any[]).map((b: any) => {
            const itens = (fila as any[]).filter((p: any) => p.bancada_id === b.id);
            const liberados = itens.filter((p: any) => p.aprovado_gestor);
            const aguardando = itens.filter((p: any) => !p.aprovado_gestor);

            return (
              <div
                key={b.id}
                className={`rounded-xl border p-4 space-y-3 ${b.is_usinagem ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {b.is_usinagem ? (
                      <Cog className="h-4 w-4 text-primary" />
                    ) : (
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="text-sm font-black uppercase tracking-tight">{b.nome}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase">
                      {liberados.length} liberado(s)
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase">
                      {aguardando.length} aguardando
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  {b.tecnico_nome && !editando[b.id] ? (
                    <>
                      <p className="flex-1 text-xs font-bold truncate">{b.tecnico_nome}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[10px] font-bold uppercase"
                        onClick={() => {
                          setNomes((prev) => ({ ...prev, [b.id]: b.tecnico_nome ?? "" }));
                          setEditando((prev) => ({ ...prev, [b.id]: true }));
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Nome do técnico"
                        value={nomes[b.id] ?? b.tecnico_nome ?? ""}
                        onChange={(e) => setNomes((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        className="h-8 text-[10px] font-bold uppercase"
                        onClick={() => salvarTecnico(b)}
                      >
                        Salvar
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={osSelecionada[b.id] ?? ""}
                    onValueChange={(val) => setOsSelecionada((prev) => ({ ...prev, [b.id]: val }))}
                  >
                    <SelectTrigger className="h-8 flex-1 text-[10px] font-bold uppercase">
                      <SelectValue placeholder="Adicionar OS na bancada" />
                    </SelectTrigger>
                    <SelectContent>
                      {osAbertas.map((o: any) => (
                        <SelectItem key={o.id} value={String(o.id)} className="text-[10px] font-bold uppercase">
                          {o.numero_os ?? String(o.id).slice(0, 8)} — {o.cliente ?? "S/ Cliente"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[10px] font-bold uppercase"
                    onClick={() => adicionarOs(b)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>


                <div className="space-y-2">
                  {itens.length === 0 ? (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-2">
                      Nenhum serviço na fila
                    </p>
                  ) : (
                    itens.map((p: any) => {
                      const os = osPorId.get(String(p.os_id));
                      return (
                        <div
                          key={p.id}
                          className={`rounded-lg border p-2 flex items-center justify-between gap-2 ${p.aprovado_gestor ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{p.nome ?? "Peça"}</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                              {p.aprovado_gestor ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" /> Pode executar
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700">
                                  <Clock className="h-3 w-3" /> Aguardando aprovação
                                </span>
                              )}
                              {os && (
                                <Link
                                  to="/os/$id"
                                  params={{ id: String(p.os_id) }}
                                  className="underline hover:text-primary"
                                >
                                  {os.numero_os ?? "OS"}
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Select
                              value={String(p.bancada_id)}
                              onValueChange={(val) =>
                                atualizarPeca(p.id, { bancada_id: val }, "Serviço movido de bancada")
                              }
                            >
                              <SelectTrigger className="h-7 w-20 text-[10px] font-bold uppercase">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(bancadas as any[]).map((op: any) => (
                                  <SelectItem key={op.id} value={String(op.id)} className="text-[10px] font-bold uppercase">
                                    {op.codigo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant={p.aprovado_gestor ? "outline" : "default"}
                              className="h-7 text-[9px] font-black uppercase"
                              onClick={() =>
                                atualizarPeca(
                                  p.id,
                                  { aprovado_gestor: !p.aprovado_gestor },
                                  p.aprovado_gestor ? "Aprovação removida" : "Serviço liberado",
                                )
                              }
                            >
                              {p.aprovado_gestor ? "Revogar" : "Aprovar"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[9px] font-black uppercase"
                              disabled={!p.aprovado_gestor}
                              title={p.aprovado_gestor ? "Dar baixa" : "Libere o serviço antes de dar baixa"}
                              onClick={() => darBaixa(p)}
                            >
                              Dar baixa
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
