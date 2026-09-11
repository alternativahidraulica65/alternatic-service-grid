import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { getExecutorEmail } from "@/lib/log-executor";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FotoThumb } from "@/components/FotoThumb";
import {
  DollarSign,
  Lock,
  Plus,
  Receipt,
  Trash2,
  Truck,
  Paperclip,
  CheckCircle2,
  Clock,
} from "lucide-react";

const BUCKET = "os-assets";

const CATEGORIAS = [
  { value: "material", label: "Material / Peça" },
  { value: "terceiros", label: "Serviço de Terceiros" },
  { value: "mao_de_obra", label: "Mão de Obra" },
  { value: "frete", label: "Frete / Logística" },
  { value: "outros", label: "Outros" },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  osId: string;
  profile: any;
  osStatus?: string | null;
}

export function CustosOsPanel({ osId, profile, osStatus }: Props) {
  const queryClient = useQueryClient();
  const { isGestor, isDiretor, isFinanceiro, isDev } = useUserRole();
  const podeVer = isGestor || isDiretor || isFinanceiro || isDev;
  const podeAprovarFornecedor = isDiretor || isFinanceiro || isDev;

  const [novo, setNovo] = useState({
    descricao: "",
    categoria: "outros",
    custo: "",
    fornecedor_id: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [uploadCusto, setUploadCusto] = useState<string | null>(null);
  const [dialogFornecedor, setDialogFornecedor] = useState(false);
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: "",
    cnpj: "",
    contato: "",
    observacoes: "",
  });

  const { data: custos = [], isLoading } = useQuery({
    queryKey: ["os_custos", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_custos" as any)
        .select("*")
        .eq("os_id", osId)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: podeVer && !!osId,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores_custos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores" as any)
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: podeVer,
  });

  const { data: comprovantes = [] } = useQuery({
    queryKey: ["os_custos_comprovantes", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fotos_anexos" as any)
        .select("*")
        .eq("os_id", osId)
        .like("categoria", "custo:%");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: podeVer && !!osId,
  });

  const fornecedoresAprovados = useMemo(
    () =>
      (fornecedores as any[]).filter(
        (f) => (f.status_cadastro ?? "aprovado") === "aprovado"
      ),
    [fornecedores]
  );
  const fornecedoresPendentes = useMemo(
    () => (fornecedores as any[]).filter((f) => f.status_cadastro === "pendente"),
    [fornecedores]
  );

  const totais = useMemo(() => {
    const soma = (arr: any[], campo: string) =>
      arr.reduce((acc, c) => acc + Number(c[campo] ?? 0), 0);
    const porCategoria = (cat: string) =>
      soma(
        (custos as any[]).filter((c) => c.categoria === cat),
        "custo_interno"
      );
    const total = soma(custos as any[], "custo_interno");
    const pago = soma(
      (custos as any[]).filter((c) => c.pago),
      "custo_interno"
    );
    return {
      material: porCategoria("material"),
      terceiros: porCategoria("terceiros"),
      mao_de_obra: porCategoria("mao_de_obra"),
      outros: total - porCategoria("material") - porCategoria("terceiros") - porCategoria("mao_de_obra"),
      total,
      pago,
      pendente: total - pago,
    };
  }, [custos]);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["os_custos", osId] });
    queryClient.invalidateQueries({ queryKey: ["os_terceiros", osId] });
  };

  const registrarLog = async (mensagem: string) => {
    try {
      await supabase.from("historico_status_os" as any).insert({
        os_id: osId,
        status_anterior: osStatus ?? null,
        status_novo: osStatus ?? "em_andamento",
        observacao: mensagem,
        executor_id: profile?.id ?? null,
        executor_email: await getExecutorEmail(),
      });
      queryClient.invalidateQueries({ queryKey: ["os_historico", osId] });
    } catch {
      // log é complementar
    }
  };

  const atualizarCusto = async (custo: any, updates: any, log?: string) => {
    try {
      const { error } = await supabase
        .from("os_custos" as any)
        .update(updates)
        .eq("id", custo.id);
      if (error) throw error;
      invalidar();
      if (log) await registrarLog(log);
    } catch (e: any) {
      toast.error("Erro ao atualizar custo: " + e.message);
    }
  };

  const adicionarCusto = async () => {
    if (!novo.descricao.trim()) {
      toast.error("Informe a descrição do custo");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("os_custos" as any).insert({
        os_id: osId,
        descricao: novo.descricao.trim(),
        categoria: novo.categoria,
        custo_interno: Number(novo.custo || 0),
        fornecedor_id: novo.fornecedor_id || null,
        is_terceirizado: novo.categoria === "terceiros",
        criado_por: profile?.user_id ?? null,
      });
      if (error) throw error;
      await registrarLog(
        `Custo lançado: "${novo.descricao.trim()}" (${novo.categoria}) — ${brl(Number(novo.custo || 0))}`
      );
      setNovo({ descricao: "", categoria: "outros", custo: "", fornecedor_id: "" });
      invalidar();
      toast.success("Custo lançado");
    } catch (e: any) {
      toast.error("Erro ao lançar custo: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const excluirCusto = async (custo: any) => {
    try {
      const { error } = await supabase.from("os_custos" as any).delete().eq("id", custo.id);
      if (error) throw error;
      await registrarLog(`Custo removido: "${custo.descricao}"`);
      invalidar();
      toast.success("Custo removido");
    } catch (e: any) {
      toast.error("Erro ao remover custo: " + e.message);
    }
  };

  const enviarComprovantes = async (custo: any, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadCusto(custo.id);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${osId}/custos/${custo.id}-${Date.now()}-${Math.random()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const { error } = await supabase.from("fotos_anexos" as any).insert({
          os_id: osId,
          foto_url: path,
          storage_path: path,
          bucket: BUCKET,
          categoria: `custo:${custo.id}`,
          tipo: "comprovante",
          legenda: file.name,
          criado_por: profile?.user_id ?? null,
        });
        if (error) throw error;
      }
      await registrarLog(`Comprovante anexado ao custo "${custo.descricao}"`);
      queryClient.invalidateQueries({ queryKey: ["os_custos_comprovantes", osId] });
      toast.success("Comprovante anexado");
    } catch (e: any) {
      toast.error("Erro ao anexar comprovante: " + e.message);
    } finally {
      setUploadCusto(null);
    }
  };

  const solicitarFornecedor = async () => {
    if (!novoFornecedor.nome.trim()) {
      toast.error("Informe o nome do fornecedor");
      return;
    }
    try {
      const aprovaDireto = podeAprovarFornecedor;
      const { error } = await supabase.from("fornecedores" as any).insert({
        nome: novoFornecedor.nome.trim(),
        cnpj: novoFornecedor.cnpj || null,
        contato: novoFornecedor.contato || null,
        observacoes: novoFornecedor.observacoes || null,
        ativo: true,
        status_cadastro: aprovaDireto ? "aprovado" : "pendente",
        solicitado_por: profile?.user_id ?? null,
        aprovado_por: aprovaDireto ? profile?.user_id ?? null : null,
        aprovado_em: aprovaDireto ? new Date().toISOString() : null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["fornecedores_custos"] });
      setNovoFornecedor({ nome: "", cnpj: "", contato: "", observacoes: "" });
      setDialogFornecedor(false);
      toast.success(
        aprovaDireto
          ? "Fornecedor cadastrado"
          : "Solicitação enviada para aprovação da diretoria/financeiro"
      );
    } catch (e: any) {
      toast.error("Erro ao solicitar fornecedor: " + e.message);
    }
  };

  const decidirFornecedor = async (fornecedor: any, aprovado: boolean) => {
    try {
      const { error } = await supabase
        .from("fornecedores" as any)
        .update({
          status_cadastro: aprovado ? "aprovado" : "reprovado",
          aprovado_por: profile?.user_id ?? null,
          aprovado_em: new Date().toISOString(),
          ativo: aprovado,
        })
        .eq("id", fornecedor.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["fornecedores_custos"] });
      toast.success(aprovado ? "Fornecedor aprovado" : "Fornecedor reprovado");
    } catch (e: any) {
      toast.error("Erro ao atualizar fornecedor: " + e.message);
    }
  };

  if (!podeVer) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center px-4">
        <Lock className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest">
          Área restrita a gestor, diretoria e financeiro
        </p>
      </div>
    );
  }

  const KPI = ({ label, valor, destaque }: { label: string; valor: number; destaque?: boolean }) => (
    <div
      className={`p-4 rounded-xl border ${
        destaque ? "border-primary/30 bg-primary/5" : "border-border bg-slate-50"
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
          destaque ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className={`text-lg font-black ${destaque ? "text-primary" : "text-foreground"}`}>
        {brl(valor)}
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Somatórios */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Materiais / Peças" valor={totais.material} />
        <KPI label="Terceiros" valor={totais.terceiros} />
        <KPI label="Mão de Obra" valor={totais.mao_de_obra} />
        <KPI label="Outros" valor={totais.outros} />
        <KPI label="Custo Total" valor={totais.total} destaque />
        <KPI label="Já Pago" valor={totais.pago} />
        <KPI label="A Pagar" valor={totais.pendente} />
      </div>

      {/* Fornecedores pendentes de aprovação */}
      {fornecedoresPendentes.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" /> Fornecedores aguardando aprovação
          </p>
          {fornecedoresPendentes.map((f: any) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-tight">
                {f.nome} {f.cnpj ? <span className="opacity-60">· {f.cnpj}</span> : null}
              </span>
              {podeAprovarFornecedor ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => decidirFornecedor(f, true)}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => decidirFornecedor(f, false)}
                  >
                    Reprovar
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="text-[9px] font-black uppercase">
                  Em aprovação
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lançar novo custo */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Plus className="h-3.5 w-3.5" /> Lançar custo avulso
        </p>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <Label className="text-[10px] font-bold uppercase">Descrição</Label>
            <Input
              className="h-9 text-xs"
              placeholder="Ex.: Óleo hidráulico, frete, retífica"
              value={novo.descricao}
              onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase">Categoria</Label>
            <Select
              value={novo.categoria}
              onValueChange={(v) => setNovo({ ...novo, categoria: v })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase">Fornecedor</Label>
            <Select
              value={novo.fornecedor_id || "none"}
              onValueChange={(v) => setNovo({ ...novo, fornecedor_id: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  Sem fornecedor
                </SelectItem>
                {fornecedoresAprovados.map((f: any) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase">Custo (R$)</Label>
            <Input
              type="number"
              step="0.01"
              className="h-9 text-xs"
              value={novo.custo}
              onChange={(e) => setNovo({ ...novo, custo: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-9 text-[10px] font-bold uppercase tracking-widest"
            disabled={salvando}
            onClick={adicionarCusto}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar custo
          </Button>
          <Dialog open={dialogFornecedor} onOpenChange={setDialogFornecedor}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-9 text-[10px] font-bold uppercase tracking-widest"
              >
                <Truck className="h-3.5 w-3.5 mr-1" /> Solicitar fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm font-black uppercase tracking-widest">
                  {podeAprovarFornecedor ? "Novo fornecedor" : "Solicitar novo fornecedor"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase">Nome *</Label>
                  <Input
                    className="h-9 text-xs"
                    value={novoFornecedor.nome}
                    onChange={(e) =>
                      setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[10px] font-bold uppercase">CNPJ</Label>
                    <Input
                      className="h-9 text-xs"
                      value={novoFornecedor.cnpj}
                      onChange={(e) =>
                        setNovoFornecedor({ ...novoFornecedor, cnpj: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase">Contato</Label>
                    <Input
                      className="h-9 text-xs"
                      value={novoFornecedor.contato}
                      onChange={(e) =>
                        setNovoFornecedor({ ...novoFornecedor, contato: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase">Observações</Label>
                  <Textarea
                    className="text-xs"
                    value={novoFornecedor.observacoes}
                    onChange={(e) =>
                      setNovoFornecedor({ ...novoFornecedor, observacoes: e.target.value })
                    }
                  />
                </div>
                <Button
                  className="w-full h-9 text-[10px] font-bold uppercase tracking-widest"
                  onClick={solicitarFornecedor}
                >
                  {podeAprovarFornecedor ? "Cadastrar" : "Enviar para aprovação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de custos */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5" /> Custos lançados nesta OS
        </p>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : custos.length === 0 ? (
          <div className="py-8 text-center opacity-40">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-[10px] font-bold uppercase">Nenhum custo lançado nesta OS.</p>
          </div>
        ) : (
          (custos as any[]).map((custo: any) => {
            const semValor = !Number(custo.custo_interno ?? 0);
            const notas = (comprovantes as any[]).filter(
              (f) => f.categoria === `custo:${custo.id}`
            );
            return (
              <div
                key={custo.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  semValor ? "border-amber-300 bg-amber-50/40" : "border-border bg-card"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-foreground">
                      {custo.descricao}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] font-black uppercase">
                        {CATEGORIAS.find((c) => c.value === custo.categoria)?.label ??
                          custo.categoria}
                      </Badge>
                      {custo.pago ? (
                        <Badge className="text-[9px] font-black uppercase bg-emerald-600 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Pago
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-black uppercase">
                          {semValor ? "Sem valor" : "A pagar"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => excluirCusto(custo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <Label className="text-[10px] font-bold uppercase">Custo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9 text-xs bg-white"
                      defaultValue={custo.custo_interno ?? ""}
                      onBlur={(e) => {
                        const val = Number(e.target.value || 0);
                        if (val !== Number(custo.custo_interno ?? 0)) {
                          atualizarCusto(
                            custo,
                            { custo_interno: val },
                            `Custo "${custo.descricao}" atualizado para ${brl(val)}`
                          );
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase">Fornecedor</Label>
                    <Select
                      value={custo.fornecedor_id ?? "none"}
                      onValueChange={(v) =>
                        atualizarCusto(
                          custo,
                          { fornecedor_id: v === "none" ? null : v },
                          `Fornecedor do custo "${custo.descricao}" atualizado`
                        )
                      }
                    >
                      <SelectTrigger className="h-9 text-xs bg-white">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">
                          Sem fornecedor
                        </SelectItem>
                        {fornecedoresAprovados.map((f: any) => (
                          <SelectItem key={f.id} value={f.id} className="text-xs">
                            {f.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase">Pagamento</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Checkbox
                        checked={!!custo.pago}
                        onCheckedChange={(v) =>
                          atualizarCusto(
                            custo,
                            {
                              pago: !!v,
                              data_pagamento: v
                                ? new Date().toISOString().slice(0, 10)
                                : null,
                            },
                            `Custo "${custo.descricao}" marcado como ${v ? "pago" : "não pago"}`
                          )
                        }
                      />
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {custo.pago
                          ? `Pago em ${
                              custo.data_pagamento
                                ? new Date(custo.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")
                                : "-"
                            }`
                          : "Marcar como pago"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notinhas / comprovantes */}
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => enviarComprovantes(custo, e.target.files)}
                    />
                    <span className="inline-flex items-center gap-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Paperclip className="h-3.5 w-3.5" />
                      {uploadCusto === custo.id ? "Enviando..." : "Anexar notinha"}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {notas.map((n: any) => (
                      <div key={n.id} className="w-16">
                        <FotoThumb url={n.foto_url} path={n.storage_path} alt={n.legenda} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
