import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  UserPlus,
  Building2,
  Search,
  MoreVertical,
  UserCircle,
  Lock,
  Percent,
  CalendarClock,
  Plus,
  Pencil,
  KeyRound,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  criarUsuario,
  resetarSenha,
  definirPermissao,
  definirStatusUsuario,
  excluirUsuario,
} from "@/lib/admin-usuarios.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({
    meta: [
      { title: "Configurações | Alternativa Hidráulica" },
      {
        name: "description",
        content:
          "Cadastro de CNPJs emissores, regras padrão de orçamento e gestão de usuários do ERP Alternativa Hidráulica.",
      },
      { property: "og:title", content: "Configurações | Alternativa Hidráulica" },
      {
        property: "og:description",
        content:
          "Cadastro de CNPJs emissores, regras padrão de orçamento e gestão de usuários do ERP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CARGOS = [
  { value: "diretor", label: "Diretor" },
  { value: "administrativo_financeiro", label: "Administrativo / Financeiro" },
  { value: "gestor", label: "Gestor" },
  { value: "operador", label: "Operador" },
  { value: "tecnico", label: "Técnico" },
  { value: "terceirizado", label: "Terceirizado" },
];

type Empresa = {
  id: string;
  nome: string | null;
  razao_social: string | null;
  cnpj: string | null;
  cor_identificacao: string | null;
  ativo: boolean | null;
};

type ConfigEmpresa = {
  id: number;
  empresa_id: string | null;
  imposto_padrao: number;
  prazo_entrega_padrao: number;
  prazo_garantia_padrao: number;
  validade_orcamento_dias: number;
  condicoes_pagamento: string | null;
  observacoes_orcamento: string | null;
  margem_padrao: number;
};

const REGRAS_PADRAO = {
  imposto_padrao: 0,
  prazo_entrega_padrao: 7,
  prazo_garantia_padrao: 90,
  validade_orcamento_dias: 15,
  margem_padrao: 30,
  condicoes_pagamento: "28 DDL após aprovação",
  observacoes_orcamento:
    "Garantia válida somente para os serviços descritos. Peças de terceiros seguem garantia do fabricante.",
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");
  return token;
}

function ConfiguracoesPage() {
  const { isDiretor, isFinanceiro } = useUserRole();
  const podeAdministrar = isDiretor || isFinanceiro;

  if (!podeAdministrar) {
    return (
      <div className="p-10">
        <Card className="border-border">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Lock className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-bold uppercase tracking-widest text-foreground">
              Acesso restrito
            </p>
            <p className="text-xs text-muted-foreground">
              Somente Diretor e Financeiro podem acessar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 pb-20 md:p-10">
      <div>
        <h2 className="font-display text-3xl font-black uppercase tracking-tighter text-foreground">
          CONFIGURAÇÕES E <span className="text-primary">CONTROLE</span>
        </h2>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Empresas emissoras, regras padrão de orçamento e gestão de acessos.
        </p>
      </div>

      <Tabs defaultValue="empresas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="empresas" className="text-xs font-black uppercase tracking-widest">
            <Building2 className="mr-2 h-4 w-4" />
            Empresas / CNPJ
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs font-black uppercase tracking-widest">
            <Shield className="mr-2 h-4 w-4" />
            Usuários e permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <AbaEmpresas />
        </TabsContent>
        <TabsContent value="usuarios">
          <AbaUsuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------------------------- Empresas --------------------------------- */

function AbaEmpresas() {
  const queryClient = useQueryClient();
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [excluindo, setExcluindo] = useState<Empresa | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setRemovendo(true);
    try {
      const { error: erroCfg } = await supabase
        .from("configuracoes_empresa")
        .delete()
        .eq("empresa_id", excluindo.id);
      if (erroCfg) throw erroCfg;

      const { error } = await supabase
        .from("empresas_emissoras")
        .delete()
        .eq("id", excluindo.id);
      if (error) throw error;

      toast.success("Empresa excluída.");
      setExcluindo(null);
      queryClient.invalidateQueries({ queryKey: ["empresas_emissoras_config"] });
      queryClient.invalidateQueries({ queryKey: ["configuracoes_empresa"] });
    } catch (e: any) {
      toast.error(
        "Não foi possível excluir: " +
          (e.message?.includes("foreign key")
            ? "esta empresa já está vinculada a ordens de serviço."
            : e.message),
      );
    } finally {
      setRemovendo(false);
    }
  };

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas_emissoras_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas_emissoras")
        .select("id, nome, razao_social, cnpj, cor_identificacao, ativo")
        .order("nome");
      if (error) throw error;
      return (data || []) as Empresa[];
    },
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["configuracoes_empresa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_empresa").select("*");
      if (error) throw error;
      return (data || []) as ConfigEmpresa[];
    },
  });

  const configDe = (empresaId: string) => configs.find((c) => c.empresa_id === empresaId);

  const abrirNova = () => {
    setEditando(null);
    setAberta(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {empresas.length} empresa(s) emissora(s) cadastradas
        </p>
        <Button
          onClick={abrirNova}
          className="h-11 bg-primary px-6 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova empresa
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {empresas.map((empresa) => {
          const cfg = configDe(empresa.id);
          return (
            <Card key={empresa.id} className="border-border shadow-md">
              <CardHeader className="flex flex-row items-start justify-between border-b border-border/50 bg-muted/10 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-2 rounded-sm"
                    style={{ background: empresa.cor_identificacao || "#facc15" }}
                  />
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-tight">
                      {empresa.nome || empresa.razao_social}
                    </CardTitle>
                    <p className="font-mono text-[11px] text-muted-foreground">{empresa.cnpj}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`border-none text-[9px] font-black uppercase tracking-widest text-white ${
                      empresa.ativo === false ? "bg-slate-400" : "bg-emerald-500"
                    }`}
                  >
                    {empresa.ativo === false ? "Inativa" : "Ativa"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditando(empresa);
                      setAberta(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setExcluindo(empresa)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 pt-5 text-xs">
                <Regra
                  icone={<CalendarClock className="h-3.5 w-3.5 text-primary" />}
                  titulo="Prazo de entrega"
                  valor={`${cfg?.prazo_entrega_padrao ?? REGRAS_PADRAO.prazo_entrega_padrao} dias`}
                />
                <Regra
                  icone={<Shield className="h-3.5 w-3.5 text-primary" />}
                  titulo="Garantia"
                  valor={`${cfg?.prazo_garantia_padrao ?? REGRAS_PADRAO.prazo_garantia_padrao} dias`}
                />
                <Regra
                  icone={<Percent className="h-3.5 w-3.5 text-primary" />}
                  titulo="Imposto"
                  valor={`${Number(cfg?.imposto_padrao ?? 0).toFixed(2)}%`}
                />
                <Regra
                  icone={<Percent className="h-3.5 w-3.5 text-primary" />}
                  titulo="Margem padrão"
                  valor={`${Number(cfg?.margem_padrao ?? 0).toFixed(2)}%`}
                />
                <Regra
                  icone={<CalendarClock className="h-3.5 w-3.5 text-primary" />}
                  titulo="Validade do orçamento"
                  valor={`${cfg?.validade_orcamento_dias ?? REGRAS_PADRAO.validade_orcamento_dias} dias`}
                />
                <Regra
                  icone={<Building2 className="h-3.5 w-3.5 text-primary" />}
                  titulo="Pagamento"
                  valor={cfg?.condicoes_pagamento || "—"}
                />
              </CardContent>
            </Card>
          );
        })}
        {empresas.length === 0 && (
          <Card className="border-2 border-dashed border-border">
            <CardContent className="py-16 text-center text-xs uppercase tracking-widest text-muted-foreground">
              Nenhuma empresa emissora cadastrada.
            </CardContent>
          </Card>
        )}
      </div>

      <DialogEmpresa
        aberta={aberta}
        onOpenChange={setAberta}
        empresa={editando}
        config={editando ? configDe(editando.id) : undefined}
        onSalvo={() => {
          queryClient.invalidateQueries({ queryKey: ["empresas_emissoras_config"] });
          queryClient.invalidateQueries({ queryKey: ["configuracoes_empresa"] });
        }}
      />

      <AlertDialog open={!!excluindo} onOpenChange={(v) => !v && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display uppercase tracking-tight">
              Excluir empresa?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A empresa <strong>{excluindo?.nome || excluindo?.razao_social}</strong> e suas regras
              padrão serão removidas definitivamente. Esta ação não pode ser desfeita.
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

function Regra({
  icone,
  titulo,
  valor,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-slate-50/60 p-3">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
        {icone}
        {titulo}
      </div>
      <p className="mt-1 text-sm font-black uppercase tracking-tight text-foreground">{valor}</p>
    </div>
  );
}

function DialogEmpresa({
  aberta,
  onOpenChange,
  empresa,
  config,
  onSalvo,
}: {
  aberta: boolean;
  onOpenChange: (v: boolean) => void;
  empresa: Empresa | null;
  config?: ConfigEmpresa | undefined;
  onSalvo: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(() => estadoInicial());

  function estadoInicial() {
    return {
      nome: "",
      razao_social: "",
      cnpj: "",
      cor_identificacao: "#facc15",
      ativo: true,
      ...REGRAS_PADRAO,
    };
  }

  // Sincroniza o formulário quando o diálogo abre.
  const [chave, setChave] = useState("");
  const chaveAtual = `${aberta}-${empresa?.id ?? "nova"}`;
  if (chave !== chaveAtual) {
    setChave(chaveAtual);
    setForm({
      nome: empresa?.nome || "",
      razao_social: empresa?.razao_social || "",
      cnpj: empresa?.cnpj || "",
      cor_identificacao: empresa?.cor_identificacao || "#facc15",
      ativo: empresa?.ativo !== false,
      imposto_padrao: Number(config?.imposto_padrao ?? REGRAS_PADRAO.imposto_padrao),
      prazo_entrega_padrao: config?.prazo_entrega_padrao ?? REGRAS_PADRAO.prazo_entrega_padrao,
      prazo_garantia_padrao: config?.prazo_garantia_padrao ?? REGRAS_PADRAO.prazo_garantia_padrao,
      validade_orcamento_dias:
        config?.validade_orcamento_dias ?? REGRAS_PADRAO.validade_orcamento_dias,
      margem_padrao: Number(config?.margem_padrao ?? REGRAS_PADRAO.margem_padrao),
      condicoes_pagamento: config?.condicoes_pagamento ?? REGRAS_PADRAO.condicoes_pagamento,
      observacoes_orcamento:
        config?.observacoes_orcamento ?? REGRAS_PADRAO.observacoes_orcamento,
    });
  }

  const salvar = async () => {
    if (!form.nome.trim() || !form.cnpj.trim()) {
      toast.error("Informe o nome e o CNPJ da empresa.");
      return;
    }
    setSalvando(true);
    try {
      let empresaId = empresa?.id;
      const dadosEmpresa = {
        nome: form.nome.trim(),
        razao_social: form.razao_social.trim() || form.nome.trim(),
        cnpj: form.cnpj.trim(),
        cor_identificacao: form.cor_identificacao,
        ativo: form.ativo,
      };

      if (empresaId) {
        const { error } = await supabase
          .from("empresas_emissoras")
          .update(dadosEmpresa)
          .eq("id", empresaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("empresas_emissoras")
          .insert(dadosEmpresa)
          .select("id")
          .single();
        if (error) throw error;
        empresaId = data.id;
      }

      const regras = {
        empresa_id: empresaId,
        imposto_padrao: Number(form.imposto_padrao) || 0,
        prazo_entrega_padrao: Number(form.prazo_entrega_padrao) || 0,
        prazo_garantia_padrao: Number(form.prazo_garantia_padrao) || 0,
        validade_orcamento_dias: Number(form.validade_orcamento_dias) || 0,
        margem_padrao: Number(form.margem_padrao) || 0,
        condicoes_pagamento: form.condicoes_pagamento,
        observacoes_orcamento: form.observacoes_orcamento,
        atualizado_em: new Date().toISOString(),
      };

      const { error: erroCfg } = await supabase
        .from("configuracoes_empresa")
        .upsert(regras, { onConflict: "empresa_id" });
      if (erroCfg) throw erroCfg;

      toast.success("Empresa e regras padrão salvas.");
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberta} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-tight">
            {empresa ? "Editar empresa emissora" : "Nova empresa emissora"}
          </DialogTitle>
          <DialogDescription>
            As regras definidas aqui são aplicadas automaticamente aos novos orçamentos desta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome fantasia">
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>
          <Campo label="Razão social">
            <Input
              value={form.razao_social}
              onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
            />
          </Campo>
          <Campo label="CNPJ">
            <Input
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              className="font-mono"
            />
          </Campo>
          <Campo label="Cor de identificação">
            <Input
              type="color"
              value={form.cor_identificacao}
              onChange={(e) => setForm({ ...form, cor_identificacao: e.target.value })}
              className="h-10 p-1"
            />
          </Campo>
          <Campo label="Prazo de entrega (dias)">
            <Input
              type="number"
              value={form.prazo_entrega_padrao}
              onChange={(e) =>
                setForm({ ...form, prazo_entrega_padrao: Number(e.target.value) })
              }
            />
          </Campo>
          <Campo label="Garantia (dias)">
            <Input
              type="number"
              value={form.prazo_garantia_padrao}
              onChange={(e) =>
                setForm({ ...form, prazo_garantia_padrao: Number(e.target.value) })
              }
            />
          </Campo>
          <Campo label="Imposto padrão (%)">
            <Input
              type="number"
              step="0.01"
              value={form.imposto_padrao}
              onChange={(e) => setForm({ ...form, imposto_padrao: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Margem padrão (%)">
            <Input
              type="number"
              step="0.01"
              value={form.margem_padrao}
              onChange={(e) => setForm({ ...form, margem_padrao: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Validade do orçamento (dias)">
            <Input
              type="number"
              value={form.validade_orcamento_dias}
              onChange={(e) =>
                setForm({ ...form, validade_orcamento_dias: Number(e.target.value) })
              }
            />
          </Campo>
          <Campo label="Condições de pagamento">
            <Input
              value={form.condicoes_pagamento}
              onChange={(e) => setForm({ ...form, condicoes_pagamento: e.target.value })}
            />
          </Campo>
          <div className="sm:col-span-2">
            <Campo label="Observações padrão do orçamento">
              <Textarea
                rows={3}
                value={form.observacoes_orcamento}
                onChange={(e) => setForm({ ...form, observacoes_orcamento: e.target.value })}
              />
            </Campo>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="btn-industrial">
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/* ---------------------------------- Usuários --------------------------------- */

function AbaUsuarios() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [senhaAlvo, setSenhaAlvo] = useState<{ userId: string; nome: string } | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<{ userId: string; nome: string } | null>(null);
  const [removendo, setRemovendo] = useState(false);

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios_config_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuarios").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["user_roles_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data || []) as { user_id: string; role: string }[];
    },
  });

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: ["usuarios_config_list"] });
    queryClient.invalidateQueries({ queryKey: ["user_roles_config"] });
  };

  const roleDe = (userId: string) =>
    roles.find((r) => r.user_id === userId)?.role || "";

  const filtrados = usuarios.filter((u) => {
    const t = busca.toLowerCase();
    return (
      !t ||
      (u.nome || "").toLowerCase().includes(t) ||
      (u.email || "").toLowerCase().includes(t)
    );
  });

  const alterarPermissao = async (userId: string, cargo: string) => {
    try {
      const accessToken = await getAccessToken();
      await definirPermissao({ data: { accessToken, userId, cargo } });
      toast.success("Permissão atualizada.");
      recarregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const alterarStatus = async (userId: string, ativo: boolean) => {
    try {
      const accessToken = await getAccessToken();
      await definirStatusUsuario({ data: { accessToken, userId, ativo } });
      toast.success(ativo ? "Usuário reativado." : "Usuário desativado.");
      recarregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const confirmarExclusaoUsuario = async () => {
    if (!excluirAlvo) return;
    setRemovendo(true);
    try {
      const accessToken = await getAccessToken();
      await excluirUsuario({ data: { accessToken, userId: excluirAlvo.userId } });
      toast.success("Usuário excluído.");
      setExcluirAlvo(null);
      recarregar();
    } catch (e: any) {
      toast.error("Não foi possível excluir: " + e.message);
    } finally {
      setRemovendo(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border shadow-md">
        <CardHeader className="border-b border-border/50 bg-muted/10 py-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold uppercase tracking-widest">
                Usuários do sistema ({usuarios.length})
              </CardTitle>
            </div>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  className="h-9 border-border bg-white pl-9 text-xs"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <Button
                onClick={() => setNovoAberto(true)}
                className="h-9 whitespace-nowrap bg-primary text-[10px] font-black uppercase tracking-widest text-primary-foreground"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Novo usuário
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="py-4 pl-6 text-[10px] font-black uppercase tracking-widest">
                  Colaborador
                </TableHead>
                <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">
                  Permissão
                </TableHead>
                <TableHead className="py-4 text-center text-[10px] font-black uppercase tracking-widest">
                  Status
                </TableHead>
                <TableHead className="py-4 pr-6 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((user: any) => (
                <TableRow
                  key={user.id}
                  className="group border-b border-border/50 transition-colors hover:bg-slate-50"
                >
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-slate-100">
                        <UserCircle className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight text-foreground">
                          {user.nome}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Select
                      value={roleDe(user.user_id) || user.cargo || ""}
                      onValueChange={(v) => alterarPermissao(user.user_id, v)}
                    >
                      <SelectTrigger className="h-9 w-56 text-xs font-bold uppercase">
                        <SelectValue placeholder="Definir permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARGOS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={!!user.ativo}
                        onCheckedChange={(v) => alterarStatus(user.user_id, v)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest ${
                          user.ativo ? "text-emerald-600" : "text-muted-foreground"
                        }`}
                      >
                        {user.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-white/10 bg-slate-900 text-white">
                        <DropdownMenuItem
                          className="cursor-pointer text-[10px] font-bold uppercase tracking-widest hover:bg-white/10"
                          onClick={() =>
                            setSenhaAlvo({ userId: user.user_id, nome: user.nome })
                          }
                        >
                          Resetar senha
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-[10px] font-bold uppercase tracking-widest hover:bg-white/10"
                          onClick={() => alterarStatus(user.user_id, !user.ativo)}
                        >
                          {user.ativo ? "Desativar acesso" : "Reativar acesso"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DialogNovoUsuario aberto={novoAberto} onOpenChange={setNovoAberto} onSalvo={recarregar} />
      <DialogSenha alvo={senhaAlvo} onClose={() => setSenhaAlvo(null)} />
    </div>
  );
}

function DialogNovoUsuario({
  aberto,
  onOpenChange,
  onSalvo,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onSalvo: () => void;
}) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "", cargo: "operador" });
  const [salvando, setSalvando] = useState(false);

  const criar = async () => {
    if (!form.nome.trim() || !form.email.trim() || form.senha.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com ao menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      const accessToken = await getAccessToken();
      await criarUsuario({ data: { accessToken, ...form } });
      toast.success("Usuário criado com acesso liberado.");
      setForm({ nome: "", email: "", senha: "", cargo: "operador" });
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao criar usuário: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-tight">Novo usuário</DialogTitle>
          <DialogDescription>
            O acesso é criado já confirmado, com a permissão escolhida.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Campo label="Nome completo">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Campo>
          <Campo label="E-mail de acesso">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Campo>
          <Campo label="Senha provisória">
            <Input
              type="text"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
            />
          </Campo>
          <Campo label="Permissão">
            <Select value={form.cargo} onValueChange={(v) => setForm({ ...form, cargo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARGOS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={criar} disabled={salvando} className="btn-industrial">
            {salvando ? "Criando..." : "Criar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogSenha({
  alvo,
  onClose,
}: {
  alvo: { userId: string; nome: string } | null;
  onClose: () => void;
}) {
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (senha.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      const accessToken = await getAccessToken();
      await resetarSenha({ data: { accessToken, userId: alvo!.userId, novaSenha: senha } });
      toast.success("Senha redefinida.");
      setSenha("");
      onClose();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!alvo} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-tight">
            <KeyRound className="h-4 w-4 text-primary" />
            Resetar senha
          </DialogTitle>
          <DialogDescription>Definir nova senha para {alvo?.nome}.</DialogDescription>
        </DialogHeader>
        <Campo label="Nova senha">
          <Input value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="btn-industrial">
            {salvando ? "Salvando..." : "Salvar senha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
