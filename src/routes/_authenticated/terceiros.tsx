import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getExecutorEmail } from "@/lib/log-executor";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { FiltrosSalvos } from "@/components/FiltrosSalvos";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Truck,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BotaoConsultaCnpj } from "@/components/BotaoConsultaCnpj";
import { cnpjValido, formatarCnpj, somenteDigitos, type DadosCnpj } from "@/lib/brasilapi";

export const Route = createFileRoute("/_authenticated/terceiros")({
  head: () => ({
    meta: [
      { title: "Painel de Terceiros — Alternativa Hidráulica" },
      {
        name: "description",
        content: "Tudo que está fora da empresa: peça, OS, terceiro responsável, prazo prometido e atraso.",
      },
      { property: "og:title", content: "Painel de Terceiros — Alternativa Hidráulica" },
      {
        property: "og:description",
        content: "Controle único de peças enviadas a terceiros, com prazos, atrasos e baixa de retorno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PainelTerceiros,
});

const fmtData = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(String(v).length <= 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const FILTROS_PADRAO = { situacao: "pendentes", terceiro: "todos", busca: "" };

function PainelTerceiros() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("pendentes");
  const [terceiro, setTerceiro] = useState("todos");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoSalvando, setNovoSalvando] = useState(false);
  const [novoForm, setNovoForm] = useState({
    os_id: "",
    nome: "",
    terceiro_nome: "",
    terceiro_prazo_entrega: "",
    terceiro_observacao: "",
  });
  const [cadOpen, setCadOpen] = useState(false);
  const [cadSalvando, setCadSalvando] = useState(false);
  const [cadForm, setCadForm] = useState({
    nome: "",
    cnpj: "",
    contato: "",
    telefone: "",
    email: "",
    endereco: "",
    observacao: "",
  });

  const { data: terceirosCadastrados = [] } = useQuery({
    queryKey: ["terceiros_cadastro"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("terceiros")
        .select("id, nome, cnpj, telefone, email, endereco, contato")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const preencherTerceiroComCnpj = (dados: DadosCnpj) => {
    setCadForm((atual) => ({
      ...atual,
      cnpj: dados.cnpjFormatado,
      nome: atual.nome || dados.nome,
      telefone: atual.telefone || dados.telefone,
      email: atual.email || dados.email,
      endereco: atual.endereco || dados.endereco,
    }));
  };

  const salvarTerceiro = async () => {
    if (!cadForm.nome.trim()) {
      toast.error("Informe o nome do terceiro.");
      return;
    }
    const cnpjDigitos = somenteDigitos(cadForm.cnpj);
    if (cnpjDigitos) {
      if (!cnpjValido(cadForm.cnpj)) {
        toast.error("CNPJ inválido. Confira os dígitos informados.");
        return;
      }
      const { data: existente } = await (supabase as any)
        .from("terceiros")
        .select("id, nome")
        .eq("cnpj", formatarCnpj(cnpjDigitos))
        .maybeSingle();
      if (existente) {
        toast.error(`Este CNPJ já está cadastrado para "${existente.nome}".`);
        return;
      }
    }
    setCadSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("terceiros").insert({
        nome: cadForm.nome.trim(),
        cnpj: cnpjDigitos ? formatarCnpj(cnpjDigitos) : null,
        contato: cadForm.contato.trim() || null,
        telefone: cadForm.telefone.trim() || null,
        email: cadForm.email.trim() || null,
        endereco: cadForm.endereco.trim() || null,
        observacao: cadForm.observacao.trim() || null,
        criado_por: auth?.user?.id ?? null,
      });
      if (error) {
        if (String(error.message).includes("duplicate") || String(error.code) === "23505") {
          toast.error("Este CNPJ já está cadastrado.");
          return;
        }
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["terceiros_cadastro"] });
      toast.success("Terceiro cadastrado com sucesso.");
      setCadForm({ nome: "", cnpj: "", contato: "", telefone: "", email: "", endereco: "", observacao: "" });
      setCadOpen(false);
    } catch (e: any) {
      toast.error("Erro ao cadastrar: " + e.message);
    } finally {
      setCadSalvando(false);
    }
  };

  const { data: ordensAbertas = [] } = useQuery({
    queryKey: ["painel_terceiros_os_abertas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ordens_servico")
        .select("id, numero_os, cliente, status")
        .order("numero_os", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: novoOpen,
  });

  const adicionarTerceiro = async () => {
    if (!novoForm.os_id) {
      toast.error("Selecione a OS.");
      return;
    }
    if (!novoForm.nome.trim()) {
      toast.error("Informe o nome da peça.");
      return;
    }
    if (!novoForm.terceiro_nome.trim()) {
      toast.error("Informe o terceiro responsável.");
      return;
    }
    setNovoSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      const { error } = await (supabase as any).from("os_pecas_rastreio").insert({
        os_id: novoForm.os_id,
        nome: novoForm.nome.trim(),
        terceiro_nome: novoForm.terceiro_nome.trim(),
        terceiro_prazo_entrega: novoForm.terceiro_prazo_entrega || null,
        terceiro_enviado_em: new Date().toISOString(),
        terceiro_observacao: novoForm.terceiro_observacao.trim() || null,
        status_peca: "Terceiros",
        criado_por: userId,
      });
      if (error) throw error;

      const os = (ordensAbertas as any[]).find((o) => String(o.id) === novoForm.os_id);
      await (supabase as any).from("historico_status_os").insert({
        os_id: novoForm.os_id,
        status_anterior: String(os?.status ?? "") || null,
        status_novo: String(os?.status ?? "") || "em_andamento",
        observacao: `Peça "${novoForm.nome.trim()}" enviada para terceiro ${
          novoForm.terceiro_nome.trim()
        }${novoForm.terceiro_prazo_entrega ? `, prazo prometido: ${novoForm.terceiro_prazo_entrega}` : ""}.`,
        executor_id: userId,
        executor_email: await getExecutorEmail(),
      });

      queryClient.invalidateQueries({ queryKey: ["painel_terceiros"] });
      queryClient.invalidateQueries({ queryKey: ["gestor_terceiros_pecas"] });
      toast.success("Peça enviada para terceiro e registrada na OS.");
      setNovoForm({ os_id: "", nome: "", terceiro_nome: "", terceiro_prazo_entrega: "", terceiro_observacao: "" });
      setNovoOpen(false);
    } catch (e: any) {
      toast.error("Erro ao adicionar: " + e.message);
    } finally {
      setNovoSalvando(false);
    }
  };

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ["painel_terceiros"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("os_pecas_rastreio")
        .select(
          "id, nome, os_id, status_peca, terceiro_nome, terceiro_prazo_entrega, terceiro_enviado_em, terceiro_recebido_em, terceiro_observacao, criado_em, ordens_servico ( numero_os, cliente, status )",
        )
        .not("terceiro_nome", "is", null)
        .order("terceiro_prazo_entrega", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const hoje = new Date().setHours(0, 0, 0, 0);

  const linhas = useMemo(() => {
    return (pecas as any[]).map((p) => {
      const prazo = p.terceiro_prazo_entrega
        ? new Date(`${String(p.terceiro_prazo_entrega).slice(0, 10)}T12:00:00`).setHours(0, 0, 0, 0)
        : null;
      const recebido = !!p.terceiro_recebido_em;
      const diasAtraso =
        !recebido && prazo !== null && prazo < hoje ? Math.floor((hoje - prazo) / 86400000) : 0;
      const diasFora = p.terceiro_enviado_em
        ? Math.floor((hoje - new Date(p.terceiro_enviado_em).setHours(0, 0, 0, 0)) / 86400000)
        : null;
      return { ...p, recebido, diasAtraso, diasFora, os: p.ordens_servico ?? null };
    });
  }, [pecas, hoje]);

  const terceirosUnicos = useMemo(
    () => Array.from(new Set(linhas.map((l) => String(l.terceiro_nome ?? "")).filter(Boolean))).sort(),
    [linhas],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas
      .filter((l) => {
        if (situacao === "pendentes" && l.recebido) return false;
        if (situacao === "atrasados" && (l.recebido || l.diasAtraso <= 0)) return false;
        if (situacao === "recebidos" && !l.recebido) return false;
        if (terceiro !== "todos" && String(l.terceiro_nome ?? "") !== terceiro) return false;
        if (!termo) return true;
        return (
          String(l.nome ?? "").toLowerCase().includes(termo) ||
          String(l.terceiro_nome ?? "").toLowerCase().includes(termo) ||
          String(l.os?.numero_os ?? "").toLowerCase().includes(termo) ||
          String(l.os?.cliente ?? "").toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => b.diasAtraso - a.diasAtraso);
  }, [linhas, busca, situacao, terceiro]);

  const idsVisiveis = filtradas.map((l) => l.id as string);
  const selecionadosVisiveis = selecionados.filter((id) => idsVisiveis.includes(id));
  const todosSelecionados = idsVisiveis.length > 0 && selecionadosVisiveis.length === idsVisiveis.length;

  const stats = useMemo(() => {
    const fora = linhas.filter((l) => !l.recebido);
    return {
      fora: fora.length,
      atrasados: fora.filter((l) => l.diasAtraso > 0).length,
      semPrazo: fora.filter((l) => !l.terceiro_prazo_entrega).length,
      recebidos: linhas.filter((l) => l.recebido).length,
    };
  }, [linhas]);

  const aplicarFiltrosSalvos = (f: any) => {
    setSituacao(f.situacao ?? FILTROS_PADRAO.situacao);
    setTerceiro(f.terceiro ?? FILTROS_PADRAO.terceiro);
    setBusca(f.busca ?? "");
  };

  const exportar = () => {
    const alvo = selecionadosVisiveis.length > 0
      ? filtradas.filter((l) => selecionadosVisiveis.includes(l.id))
      : filtradas;
    if (alvo.length === 0) {
      toast.error("Nenhum item para exportar.");
      return;
    }
    exportToCSV(
      alvo.map((l) => ({
        os: l.os?.numero_os ?? "",
        cliente: l.os?.cliente ?? "",
        peca: l.nome ?? "",
        terceiro: l.terceiro_nome ?? "",
        enviado_em: fmtData(l.terceiro_enviado_em),
        prazo_prometido: fmtData(l.terceiro_prazo_entrega),
        dias_em_atraso: l.diasAtraso,
        recebido_em: fmtData(l.terceiro_recebido_em),
        situacao: l.recebido ? "Recebido" : l.diasAtraso > 0 ? "Atrasado" : "Fora da empresa",
        observacao: l.terceiro_observacao ?? "",
      })),
      "terceiros.csv",
    );
  };

  const registrarRetorno = async (linha: any) => {
    setSalvandoId(linha.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      const { error } = await (supabase as any)
        .from("os_pecas_rastreio")
        .update({
          terceiro_recebido_em: new Date().toISOString(),
          terceiro_recebido_por: userId,
          status_peca: "Recebido de Terceiros",
        })
        .eq("id", linha.id);
      if (error) throw error;

      const statusOs = String(linha.os?.status ?? "");
      await (supabase as any).from("historico_status_os").insert({
        os_id: linha.os_id,
        status_anterior: statusOs || null,
        status_novo: statusOs || "em_andamento",
        observacao: `Retorno de terceiros: peça "${linha.nome ?? "Peça"}" recebida de ${
          linha.terceiro_nome || "terceiro não informado"
        }.`,
        executor_id: userId,
        executor_email: await getExecutorEmail(),
      });

      queryClient.invalidateQueries({ queryKey: ["painel_terceiros"] });
      queryClient.invalidateQueries({ queryKey: ["gestor_terceiros_pecas"] });
      toast.success("Retorno registrado e gravado no histórico da OS.");
    } catch (e: any) {
      toast.error("Erro ao registrar retorno: " + e.message);
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.navigate({ to: "/dashboard" })}
            className="text-muted-foreground hover:text-primary"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">
              PAINEL DE <span className="text-primary">TERCEIROS</span>
            </h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
              Tudo que está fora da empresa, com prazo prometido e atraso.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-border shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <Truck className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-black">{stats.fora}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fora da empresa</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
            <p className="text-2xl font-black text-red-600">{stats.atrasados}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Em atraso</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <CalendarClock className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-2xl font-black">{stats.semPrazo}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem prazo definido</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
            <p className="text-2xl font-black">{stats.recebidos}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Já retornaram</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Peça, terceiro, OS ou cliente..."
                className="pl-10 h-10 bg-white"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="h-10 w-[170px] bg-white text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendentes">Fora da empresa</SelectItem>
                  <SelectItem value="atrasados">Somente atrasados</SelectItem>
                  <SelectItem value="recebidos">Já retornaram</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={terceiro} onValueChange={setTerceiro}>
                <SelectTrigger className="h-10 w-[190px] bg-white text-xs font-bold">
                  <SelectValue placeholder="Terceiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os terceiros</SelectItem>
                  {terceirosUnicos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FiltrosSalvos
                lista="terceiros"
                filtros={{ situacao, terceiro, busca }}
                onAplicar={aplicarFiltrosSalvos}
              />
              <Button
                size="sm"
                className="h-10 font-black uppercase text-[10px] tracking-widest"
                onClick={() => setNovoOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Novo terceiro
              </Button>
              {selecionadosVisiveis.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 text-[10px] font-bold uppercase"
                  onClick={() => setSelecionados([])}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Limpar seleção
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-10 font-bold uppercase text-[10px] tracking-widest" onClick={exportar}>
                <Download className="mr-2 h-4 w-4" />
                {selecionadosVisiveis.length > 0 ? `Exportar (${selecionadosVisiveis.length})` : "Exportar"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Selecionar todos os itens filtrados"
                    checked={todosSelecionados}
                    onCheckedChange={() => setSelecionados(todosSelecionados ? [] : idsVisiveis)}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">OS / Cliente</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Peça</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Terceiro</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Enviado</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Prazo</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Situação</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Nenhuma peça nesta situação
                  </TableCell>
                </TableRow>
              )}
              {filtradas.map((l) => (
                <TableRow key={l.id} className={l.diasAtraso > 0 && !l.recebido ? "bg-red-50/50" : undefined}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Selecionar ${l.nome ?? "peça"}`}
                      checked={selecionados.includes(l.id)}
                      onCheckedChange={() =>
                        setSelecionados((atual) =>
                          atual.includes(l.id) ? atual.filter((i) => i !== l.id) : [...atual, l.id],
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/os/$id"
                      params={{ id: String(l.os_id) }}
                      className="text-xs font-black uppercase hover:text-primary"
                    >
                      {l.os?.numero_os ?? "OS"}
                    </Link>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{l.os?.cliente ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-xs font-semibold">{l.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{l.terceiro_nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {fmtData(l.terceiro_enviado_em)}
                    {l.diasFora !== null && !l.recebido && (
                      <span className="block text-[10px] text-muted-foreground">há {l.diasFora}d</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{fmtData(l.terceiro_prazo_entrega)}</TableCell>
                  <TableCell>
                    {l.recebido ? (
                      <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase">
                        Recebido {fmtData(l.terceiro_recebido_em)}
                      </Badge>
                    ) : l.diasAtraso > 0 ? (
                      <Badge className="bg-red-500 text-white text-[9px] font-black uppercase">
                        {l.diasAtraso}d de atraso
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-black uppercase">
                        No prazo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!l.recebido && (
                      <Button
                        size="sm"
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        disabled={salvandoId === l.id}
                        onClick={() => registrarRetorno(l)}
                      >
                        {salvandoId === l.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        )}
                        Registrar retorno
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Enviar peça para terceiro
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Escolha a OS, a peça e o terceiro. O envio fica gravado na OS e aparece aqui no painel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Ordem de Serviço *</Label>
              <Select
                value={novoForm.os_id}
                onValueChange={(v) => setNovoForm((f) => ({ ...f, os_id: v }))}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Selecione a OS" />
                </SelectTrigger>
                <SelectContent>
                  {(ordensAbertas as any[]).map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.numero_os} — {o.cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Peça enviada *</Label>
              <Input
                className="h-10 text-xs"
                placeholder="Ex.: Bloco hidráulico da bomba"
                value={novoForm.nome}
                onChange={(e) => setNovoForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest">Terceiro responsável *</Label>
                <Input
                  className="h-10 text-xs"
                  placeholder="Nome do terceiro"
                  value={novoForm.terceiro_nome}
                  onChange={(e) => setNovoForm((f) => ({ ...f, terceiro_nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest">Prazo prometido</Label>
                <Input
                  type="date"
                  className="h-10 text-xs"
                  value={novoForm.terceiro_prazo_entrega}
                  onChange={(e) =>
                    setNovoForm((f) => ({ ...f, terceiro_prazo_entrega: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest">Observação</Label>
              <Textarea
                className="text-xs"
                rows={3}
                placeholder="Serviço contratado, contato, referência..."
                value={novoForm.terceiro_observacao}
                onChange={(e) => setNovoForm((f) => ({ ...f, terceiro_observacao: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setNovoOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="font-black uppercase text-[10px] tracking-widest"
                disabled={novoSalvando}
                onClick={adicionarTerceiro}
              >
                {novoSalvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Registrar envio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
