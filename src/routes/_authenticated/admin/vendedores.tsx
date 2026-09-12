import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import {
  Users,
  UserCheck,
  Percent,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle,
  Mail,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { TIPOS_COMISSAO, rotuloComissao, type TipoComissao } from "@/lib/comissao";

type Vendedor = {
  id: string;
  nome: string;
  apelido: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  tipo_comissao: TipoComissao;
  percentual: number | null;
  valor_comissao: number | null;
  observacao: string | null;
  ativo: boolean;
  vendedor_empresas: { empresa_id: string; empresas_emissoras: { id: string; nome: string } | null }[];
};

type FormState = {
  nome: string;
  apelido: string;
  cpf_cnpj: string;
  email: string;
  telefone: string;
  tipo_comissao: TipoComissao;
  percentual: string;
  valor_comissao: string;
  observacao: string;
  ativo: boolean;
  empresas_ids: string[];
};

const FORM_VAZIO: FormState = {
  nome: "",
  apelido: "",
  cpf_cnpj: "",
  email: "",
  telefone: "",
  tipo_comissao: "percentual_os",
  percentual: "",
  valor_comissao: "",
  observacao: "",
  ativo: true,
  empresas_ids: [],
};

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  beforeLoad: ({ context, location }) => {
    const { roles, profile, isDiretor, isFinanceiro } = context as any;
    const cargo = profile?.cargo || "";
    const temPermissao =
      isDiretor ||
      isFinanceiro ||
      cargo === "diretor" ||
      cargo === "administrativo_financeiro" ||
      (roles as string[]).includes("diretor") ||
      (roles as string[]).includes("administrativo_financeiro");
    if (!temPermissao) {
      throw redirect({ to: "/dashboard", search: { redirect: location.href } });
    }
  },
  component: VendedoresPage,
});

/** Mantém as colunas antigas coerentes com o novo tipo de comissão. */
function compatibilidadeLegado(tipo: TipoComissao) {
  return {
    regra_comissao: tipo === "margem_bruta" ? "lucro_liquido" : "percentual_bruto",
    tipo_calculo: tipo === "valor_fixo" ? "divisao_custos" : "percentual",
  };
}

function VendedoresPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("all");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Vendedor | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<Vendedor | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const { data: vendedores = [], isLoading } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendedores")
        .select(
          `*, vendedor_empresas ( empresa_id, empresas_emissoras ( id, nome ) )`,
        )
        .order("nome");
      if (error) throw error;
      return (data || []) as unknown as Vendedor[];
    },
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas_emissoras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas_emissoras")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErros({});
    setModalAberto(true);
  };

  const abrirEdicao = (v: Vendedor) => {
    setEditando(v);
    setErros({});
    setForm({
      nome: v.nome || "",
      apelido: v.apelido || "",
      cpf_cnpj: v.cpf_cnpj || "",
      email: v.email || "",
      telefone: v.telefone || "",
      tipo_comissao: (v.tipo_comissao as TipoComissao) || "percentual_os",
      percentual: v.percentual != null ? String(v.percentual) : "",
      valor_comissao: v.valor_comissao != null ? String(v.valor_comissao) : "",
      observacao: v.observacao || "",
      ativo: !!v.ativo,
      empresas_ids: (v.vendedor_empresas || []).map((ve) => ve.empresa_id),
    });
    setModalAberto(true);
  };

  const validar = () => {
    const e: Record<string, string> = {};
    if (form.nome.trim().length < 3) e['nome'] = "Informe o nome completo.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e['email'] = "E-mail inválido.";
    if (form.empresas_ids.length === 0) e['empresas'] = "Vincule pelo menos uma empresa.";
    if (form.tipo_comissao === "valor_fixo") {
      if (!(Number(form.valor_comissao) > 0)) e['valor'] = "Informe o valor da comissão.";
    } else if (form.tipo_comissao !== "metas") {
      const p = Number(form.percentual);
      if (!(p > 0) || p > 100) e['percentual'] = "Informe um percentual entre 0 e 100.";
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const salvar = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        nome: form.nome.trim(),
        apelido: form.apelido.trim() || null,
        cpf_cnpj: form.cpf_cnpj.trim() || null,
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        tipo_comissao: form.tipo_comissao,
        percentual: form.tipo_comissao === "valor_fixo" ? 0 : Number(form.percentual) || 0,
        valor_comissao: form.tipo_comissao === "valor_fixo" ? Number(form.valor_comissao) || 0 : 0,
        observacao: form.observacao.trim() || null,
        ativo: form.ativo,
        ...compatibilidadeLegado(form.tipo_comissao),
      };

      let vendedorId = editando?.id;

      if (editando) {
        const { error } = await supabase
          .from("vendedores")
          .update(payload as any)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("vendedores")
          .insert([payload] as any)
          .select("id")
          .single();
        if (error) throw error;
        vendedorId = (data as any).id;
      }

      await supabase.from("vendedor_empresas").delete().eq("vendedor_id", vendedorId!);
      if (form.empresas_ids.length) {
        const { error } = await supabase
          .from("vendedor_empresas")
          .insert(form.empresas_ids.map((empresa_id) => ({ vendedor_id: vendedorId!, empresa_id })) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
      toast.success(editando ? "Vendedor atualizado." : "Vendedor cadastrado.");
      setModalAberto(false);
      setEditando(null);
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const alternarStatus = async (v: Vendedor, ativo: boolean) => {
    const { error } = await supabase.from("vendedores").update({ ativo } as any).eq("id", v.id);
    if (error) {
      toast.error("Não foi possível alterar o status: " + error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["vendedores"] });
    toast.success(ativo ? "Vendedor ativado." : "Vendedor desativado.");
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setRemovendo(true);
    try {
      const { count } = await (supabase as any)
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("vendedor_id", excluindo.id);


      if ((count || 0) > 0) {
        toast.error(
          `Este vendedor está ligado a ${count} cliente(s). Desative-o em vez de excluir.`,
        );
        return;
      }

      await supabase.from("vendedor_empresas").delete().eq("vendedor_id", excluindo.id);
      const { error } = await supabase.from("vendedores").delete().eq("id", excluindo.id);
      if (error) throw error;

      toast.success("Vendedor excluído.");
      setExcluindo(null);
      queryClient.invalidateQueries({ queryKey: ["vendedores"] });
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    } finally {
      setRemovendo(false);
    }
  };

  const lista = useMemo(() => {
    const termo = busca.toLowerCase();
    return vendedores.filter((v) => {
      const alvo = `${v.nome} ${v.apelido || ""} ${v.cpf_cnpj || ""} ${v.email || ""}`.toLowerCase();
      const okBusca = alvo.includes(termo);
      const okTipo = filtroTipo === "all" || v.tipo_comissao === filtroTipo;
      const okStatus =
        filtroStatus === "all" ||
        (filtroStatus === "ativos" ? v.ativo : !v.ativo);
      return okBusca && okTipo && okStatus;
    });
  }, [vendedores, busca, filtroTipo, filtroStatus]);

  const kpis = useMemo(() => {
    const ativos = vendedores.filter((v) => v.ativo).length;
    const porTipo = (t: TipoComissao) => vendedores.filter((v) => v.tipo_comissao === t).length;
    return {
      total: vendedores.length,
      ativos,
      percentuais: porTipo("percentual_os") + porTipo("metas"),
      margem: porTipo("margem_bruta") + porTipo("valor_fixo"),
    };
  }, [vendedores]);

  const tipoAtual = TIPOS_COMISSAO.find((t) => t.valor === form.tipo_comissao);

  return (
    <div className="container-industrial py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <Link to="/dashboard">
            <Button variant="outline" size="icon" className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">
              Gestão de Vendedores &amp; Comissões
            </h1>
            <p className="text-slate-500 font-medium">
              Cadastro completo, empresas vinculadas e regra de comissão usada no orçamento.
            </p>
          </div>
        </div>
        <Button onClick={abrirNovo} className="btn-industrial bg-slate-900 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" />
          Novo Vendedor
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icone: Users, cor: "text-slate-600", fundo: "bg-slate-100", titulo: "Vendedores cadastrados", valor: kpis.total },
          { icone: UserCheck, cor: "text-emerald-600", fundo: "bg-emerald-50", titulo: "Ativos", valor: kpis.ativos },
          { icone: Percent, cor: "text-primary", fundo: "bg-primary/10", titulo: "Comissão por percentual", valor: kpis.percentuais },
        ].map((k) => (
          <Card key={k.titulo} className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${k.fundo} flex items-center justify-center`}>
                <k.icone className={`h-6 w-6 ${k.cor}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{k.titulo}</p>
                <p className="text-3xl font-display font-black text-slate-900">{k.valor}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros + tabela */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, apelido, CPF/CNPJ ou e-mail..."
                className="pl-10 bg-white border-slate-200"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[230px] bg-white border-slate-200">
                  <Filter className="mr-2 h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Tipo de comissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {TIPOS_COMISSAO.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[150px] bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vendedor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contato</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CPF / CNPJ</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comissão</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Empresas</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-500 px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-400 font-medium">
                    Carregando vendedores...
                  </TableCell>
                </TableRow>
              ) : lista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-400 font-medium">
                    Nenhum vendedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                lista.map((v) => (
                  <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <p className="font-bold text-slate-900">{v.nome}</p>
                      {v.apelido && <p className="text-xs text-slate-400">{v.apelido}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 space-y-1">
                      {v.email && (
                        <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{v.email}</p>
                      )}
                      {v.telefone && (
                        <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{v.telefone}</p>
                      )}
                      {!v.email && !v.telefone && <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">{v.cpf_cnpj || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary font-bold uppercase tracking-wider text-[9px]">
                        {rotuloComissao(v)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(v.vendedor_empresas || []).slice(0, 2).map((ve) => (
                          <Badge key={ve.empresa_id} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] uppercase font-bold">
                            {ve.empresas_emissoras?.nome || "Empresa"}
                          </Badge>
                        ))}
                        {(v.vendedor_empresas || []).length > 2 && (
                          <Badge variant="secondary" className="bg-slate-200 text-slate-600 border-none text-[9px] uppercase font-bold">
                            +{v.vendedor_empresas.length - 2}
                          </Badge>
                        )}
                        {(v.vendedor_empresas || []).length === 0 && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!v.ativo}
                          onCheckedChange={(val) => alternarStatus(v, val)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {v.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-slate-200 shadow-xl">
                          <DropdownMenuItem onClick={() => abrirEdicao(v)} className="text-xs font-bold uppercase tracking-widest py-2 cursor-pointer">
                            <Edit className="mr-2 h-3 w-3" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setExcluindo(v)}
                            className="text-xs font-bold uppercase tracking-widest py-2 text-red-500 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
        <AlertCircle className="h-3 w-3" />
        A comissão do orçamento usa o vendedor responsável pelo cliente da OS.
      </div>

      {/* Modal de cadastro/edição */}
      <Dialog
        open={modalAberto}
        onOpenChange={(open) => {
          setModalAberto(open);
          if (!open) setEditando(null);
        }}
      >
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto border-slate-200 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl uppercase tracking-wider text-slate-900">
              {editando ? "Editar Vendedor" : "Cadastro de Vendedor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nome completo</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="bg-slate-50 border-slate-200"
                />
                {erros['nome'] && <p className="text-xs text-red-500">{erros['nome']}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Apelido / Nome de campo</Label>
                <Input
                  value={form.apelido}
                  onChange={(e) => setForm({ ...form, apelido: e.target.value })}
                  placeholder="Ex: Carlos - Vendas Campo"
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CPF ou CNPJ</Label>
                <Input
                  value={form.cpf_cnpj}
                  onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">WhatsApp / Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">E-mail corporativo</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="vendedor@alternativa.com"
                  className="bg-slate-50 border-slate-200"
                />
                {erros['email'] && <p className="text-xs text-red-500">{erros['email']}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-700">Status do vendedor</p>
                <p className="text-[11px] text-slate-400">Inativos não recebem novas comissões.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {form.ativo ? "Ativo" : "Inativo"}
                </span>
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tipo de comissão</Label>
              <Select
                value={form.tipo_comissao}
                onValueChange={(v) => setForm({ ...form, tipo_comissao: v as TipoComissao })}
              >
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_COMISSAO.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoAtual && <p className="text-[11px] text-slate-400">{tipoAtual.ajuda}</p>}
            </div>

            {form.tipo_comissao === "valor_fixo" ? (
              <div className="space-y-2 max-w-xs">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Valor da comissão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_comissao}
                  onChange={(e) => setForm({ ...form, valor_comissao: e.target.value })}
                  className="bg-slate-50 border-slate-200"
                />
                {erros['valor'] && <p className="text-xs text-red-500">{erros['valor']}</p>}
              </div>
            ) : form.tipo_comissao === "metas" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-medium text-amber-800">
                Faixas padrão: até R$ 50.000 = 3% · de R$ 50.001 a R$ 100.000 = 5% · acima de R$ 100.000 = 7%
                (sobre o faturamento acumulado do vendedor no mês).
              </div>
            ) : (
              <div className="space-y-2 max-w-xs">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Percentual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.percentual}
                  onChange={(e) => setForm({ ...form, percentual: e.target.value })}
                  className="bg-slate-50 border-slate-200"
                />
                {erros['percentual'] && <p className="text-xs text-red-500">{erros['percentual']}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Empresas vinculadas</Label>
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50 max-h-40 overflow-y-auto">
                {empresas.map((empresa: any) => (
                  <div key={empresa.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${empresa.id}`}
                      checked={form.empresas_ids.includes(empresa.id)}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          empresas_ids: checked
                            ? [...form.empresas_ids, empresa.id]
                            : form.empresas_ids.filter((i) => i !== empresa.id),
                        })
                      }
                    />
                    <label htmlFor={`emp-${empresa.id}`} className="text-xs font-medium text-slate-700 cursor-pointer">
                      {empresa.nome}
                    </label>
                  </div>
                ))}
              </div>
              {erros['empresas'] && <p className="text-xs text-red-500">{erros['empresas']}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Observação (opcional)</Label>
              <Textarea
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                className="bg-slate-50 border-slate-200 resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalAberto(false)} className="font-bold uppercase tracking-widest text-xs">
              Cancelar
            </Button>
            <Button
              onClick={() => validar() && salvar.mutate()}
              disabled={salvar.isPending}
              className="btn-industrial bg-slate-900 text-white font-bold uppercase tracking-widest text-xs"
            >
              {salvar.isPending ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar vendedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase tracking-tight">Excluir vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              O cadastro de <strong>{excluindo?.nome}</strong> e seus vínculos com empresas serão removidos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarExclusao();
              }}
              disabled={removendo}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {removendo ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
