import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Building2,
  TrendingUp,
  History,
  AlertCircle,
  ArrowLeft,
  Download,
  Upload,
  Check,
  Loader2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/utils/export";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/clientes/")({
  component: ClientesPage,
});

type SortKey = "nome" | "cnpj" | "vendedor" | "cidade" | "criado_em" | "status";

const FORM_VAZIO = {
  nome: "",
  cnpj: "",
  endereco: "",
  email: "",
  telefone: "",
  vendedor: "nenhum",
};

const COLUNAS_MODELO = ["nome", "cnpj", "email", "telefone", "endereco", "vendedor"];

/** Parser simples de CSV com suporte a aspas e separador , ou ; */
function parseCSV(texto: string): string[][] {
  const limpo = texto.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const primeiraLinha = limpo.split("\n")[0] ?? "";
  const sep = (primeiraLinha.match(/;/g)?.length ?? 0) > (primeiraLinha.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === sep) {
      linha.push(campo.trim());
      campo = "";
    } else if (c === "\n") {
      linha.push(campo.trim());
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  linha.push(campo.trim());
  linhas.push(linha);
  return linhas.filter((l) => l.some((v) => v !== ""));
}

function ClientesPage() {
  const { isDiretor, isFinanceiro, isGestor } = Route.useRouteContext();
  const canWrite = isDiretor || isFinanceiro || isGestor;
  const canDelete = isDiretor || isGestor;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "nome", dir: "asc" });
  const [importando, setImportando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [formValues, setFormValues] = useState({ ...FORM_VAZIO });

  const { data: clientes = [] } = useSuspenseQuery({
    queryKey: ['clientes_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').order('nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores_ativos'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vendedores')
        .select('id, nome, apelido, tipo_comissao, percentual, valor_comissao, ativo')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const mapaVendedores = useMemo(() => {
    const m = new Map<string, any>();
    vendedores.forEach((v: any) => m.set(v.id, v));
    return m;
  }, [vendedores]);

  const nomeVendedor = (cliente: any) => {
    if (cliente.venda_propria) return "Próprio";
    const v = cliente.vendedor_id ? mapaVendedores.get(cliente.vendedor_id) : null;
    return v ? (v.apelido || v.nome) : "—";
  };

  // Alguns bancos ainda não possuem a coluna venda_propria. Detectamos pelo
  // próprio registro carregado e, quando ausente, gravamos só o vendedor_id.
  const suportaVendaPropria = useMemo(
    () =>
      clientes.length === 0 ||
      Object.prototype.hasOwnProperty.call(clientes[0] as any, "venda_propria"),
    [clientes]
  );

  const patchVendedor = (valor: string) => {
    const base =
      valor === "proprio"
        ? { vendedor_id: null, venda_propria: true }
        : valor === "nenhum"
          ? { vendedor_id: null, venda_propria: false }
          : { vendedor_id: valor, venda_propria: false };
    if (suportaVendaPropria) return base;
    const { venda_propria: _ignorado, ...semColuna } = base;
    return semColuna;
  };

  const createMutation = useMutation({
    mutationFn: async (values: typeof formValues) => {
      if (!values.nome.trim()) throw new Error("O nome é obrigatório");
      const { error } = await supabase.from('clientes').insert([{
        nome: values.nome,
        cnpj: values.cnpj,
        endereco: values.endereco,
        email: values.email,
        telefone: values.telefone,
        ...patchVendedor(values.vendedor),
      } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      setIsDialogOpen(false);
      setFormValues({ ...FORM_VAZIO });
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar cliente: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: typeof formValues & { id: string }) => {
      if (!values.nome.trim()) throw new Error("O nome é obrigatório");
      const { error } = await supabase.from('clientes').update({
        nome: values.nome,
        cnpj: values.cnpj,
        endereco: values.endereco,
        email: values.email,
        telefone: values.telefone,
        ...patchVendedor(values.vendedor),
      } as any).eq('id', values.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setSelectedCliente(null);
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar cliente: " + error.message);
    }
  });

  const aprovacaoMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'aprovado' | 'reprovado' }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('clientes').update({
        status_cadastro: status,
        aprovado_por: userData.user?.id ?? null,
        aprovado_em: new Date().toISOString(),
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === 'aprovado' ? "Cadastro aprovado!" : "Cadastro reprovado.");
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
      queryClient.invalidateQueries({ queryKey: ['clientes_lookup'] });
    },
    onError: (error: any) => toast.error("Erro ao atualizar aprovação: " + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
    },
    onError: (error: any) => {
      toast.error("Erro ao remover: " + error.message);
    }
  });

  const filtrosAtivos =
    (filtroStatus !== "todos" ? 1 : 0) +
    (filtroVendedor !== "todos" ? 1 : 0) +
    (filtroPeriodo !== "todos" ? 1 : 0);

  const filteredClientes = useMemo(() => {
    const termo = searchTerm.toLowerCase();
    const agora = new Date();

    const base = clientes.filter((c: any) => {
      const buscaOk =
        (c.nome ?? c.razao_social ?? "").toLowerCase().includes(termo) ||
        (c.cnpj ?? "").includes(searchTerm) ||
        (c.endereco ?? "").toLowerCase().includes(termo);
      if (!buscaOk) return false;

      if (filtroStatus !== "todos") {
        const status = c.status_cadastro || "aprovado";
        if (status !== filtroStatus) return false;
      }

      if (filtroVendedor === "proprio" && !c.venda_propria) return false;
      if (filtroVendedor === "sem" && (c.venda_propria || c.vendedor_id)) return false;
      if (
        filtroVendedor !== "todos" &&
        filtroVendedor !== "proprio" &&
        filtroVendedor !== "sem" &&
        c.vendedor_id !== filtroVendedor
      ) return false;

      if (filtroPeriodo !== "todos") {
        const criado = c.criado_em ? new Date(c.criado_em) : null;
        if (!criado) return false;
        const dias = (agora.getTime() - criado.getTime()) / 86400000;
        if (filtroPeriodo === "30" && dias > 30) return false;
        if (filtroPeriodo === "90" && dias > 90) return false;
        if (filtroPeriodo === "365" && dias > 365) return false;
      }

      return true;
    });

    const valorOrdenacao = (c: any): string | number => {
      switch (sort.key) {
        case "nome": return (c.nome ?? "").toLowerCase();
        case "cnpj": return (c.cnpj ?? "").toLowerCase();
        case "vendedor": return nomeVendedor(c).toLowerCase();
        case "cidade": return (c.endereco ?? "").toLowerCase();
        case "criado_em": return c.criado_em ? new Date(c.criado_em).getTime() : 0;
        case "status": return (c.status_cadastro ?? "aprovado").toLowerCase();
      }
    };

    return [...base].sort((a, b) => {
      const va = valorOrdenacao(a);
      const vb = valorOrdenacao(b);
      let r = 0;
      if (typeof va === "number" && typeof vb === "number") r = va - vb;
      else r = String(va).localeCompare(String(vb), "pt-BR");
      return sort.dir === "asc" ? r : -r;
    });
  }, [clientes, searchTerm, filtroStatus, filtroVendedor, filtroPeriodo, sort, mapaVendedores]);

  const stats = {
    total: clientes.length,
    premium: clientes.filter((c: any) => c.venda_propria).length,
    inativos: clientes.filter((c: any) => c.status_cadastro === 'pendente').length,
    novos: clientes.filter((c: any) => {
      const createdDate = new Date(c.criado_em || '');
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
    }).length
  };

  const alternarOrdenacao = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const IconeOrdenacao = ({ chave }: { chave: SortKey }) => {
    if (sort.key !== chave) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sort.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const CabecalhoOrdenavel = ({ chave, label, className = "" }: { chave: SortKey; label: string; className?: string }) => (
    <TableHead className={`text-[10px] font-black uppercase tracking-widest py-4 ${className}`}>
      <button
        type="button"
        onClick={() => alternarOrdenacao(chave)}
        className="inline-flex items-center gap-1.5 hover:text-primary transition-colors uppercase"
      >
        {label}
        <IconeOrdenacao chave={chave} />
      </button>
    </TableHead>
  );

  const handleEdit = (cliente: any) => {
    setSelectedCliente(cliente);
    setFormValues({
      nome: cliente.nome || "",
      cnpj: cliente.cnpj || "",
      endereco: cliente.endereco || "",
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      vendedor: cliente.venda_propria ? "proprio" : (cliente.vendedor_id || "nenhum"),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (cliente: any) => {
    toast.error("Remoção confirmada", {
      description: `Deseja remover ${cliente.nome}?`,
      action: {
        label: "Remover",
        onClick: () => deleteMutation.mutate(cliente.id)
      }
    });
  };

  const baixarModelo = () => {
    const exemplo = [
      COLUNAS_MODELO.join(","),
      '"Indústria Exemplo Ltda","00.000.000/0001-00","contato@exemplo.com","(11) 90000-0000","Av. Industrial, 100 - Campinas/SP","PRÓPRIO"',
      '"Cliente Exemplo 2","11.111.111/0001-11","compras@exemplo2.com","(19) 3333-3333","Rua das Bombas, 55 - Piracicaba/SP",""',
    ].join("\n");
    const blob = new Blob(["\ufeff" + exemplo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-importacao-clientes.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado. Preencha e use o botão Importar.");
  };

  const exportarClientes = () => {
    exportToCSV(
      filteredClientes.map((c: any) => ({
        nome: c.nome ?? "",
        cnpj: c.cnpj ?? "",
        email: c.email ?? "",
        telefone: c.telefone ?? "",
        endereco: c.endereco ?? "",
        vendedor: nomeVendedor(c),
        status_cadastro: c.status_cadastro ?? "aprovado",
        criado_em: c.criado_em ?? "",
      })),
      "clientes.csv"
    );
  };

  const importarArquivo = async (file: File) => {
    setImportando(true);
    try {
      const linhas = parseCSV(await file.text());
      if (linhas.length < 2) throw new Error("O arquivo não possui linhas de dados.");

      const cabecalho = linhas[0]!.map((h) => h.toLowerCase().trim());
      const idx = (nome: string) => cabecalho.indexOf(nome);
      if (idx("nome") === -1) throw new Error('O arquivo precisa ter a coluna "nome" (use o modelo).');

      const registros: any[] = [];
      const erros: string[] = [];

      linhas.slice(1).forEach((linha, i) => {
        const valor = (col: string) => (idx(col) >= 0 ? (linha[idx(col)] ?? "").trim() : "");
        const nome = valor("nome");
        if (!nome) {
          erros.push(`Linha ${i + 2}: nome vazio.`);
          return;
        }
        const vendTexto = valor("vendedor");
        let vendedorPatch: any = { vendedor_id: null, venda_propria: false };
        if (vendTexto) {
          const normal = vendTexto.toLowerCase();
          if (normal === "proprio" || normal === "próprio") {
            vendedorPatch = { vendedor_id: null, venda_propria: true };
          } else {
            const achado = vendedores.find(
              (v: any) =>
                (v.nome ?? "").toLowerCase() === normal || (v.apelido ?? "").toLowerCase() === normal
            );
            if (!achado) {
              erros.push(`Linha ${i + 2}: vendedor "${vendTexto}" não encontrado.`);
              return;
            }
            vendedorPatch = { vendedor_id: achado.id, venda_propria: false };
          }
        }
        registros.push({
          nome,
          cnpj: valor("cnpj") || null,
          email: valor("email") || null,
          telefone: valor("telefone") || null,
          endereco: valor("endereco") || null,
          ...vendedorPatch,
        });
      });

      if (registros.length === 0) {
        throw new Error(erros[0] ?? "Nenhuma linha válida encontrada.");
      }

      const { error } = await supabase.from('clientes').insert(registros as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['clientes_list'] });
      toast.success(`${registros.length} cliente(s) importado(s).`, {
        description: erros.length ? `${erros.length} linha(s) ignorada(s): ${erros.slice(0, 3).join(" ")}` : undefined,
      });
    } catch (e: any) {
      toast.error("Falha na importação: " + (e?.message ?? "arquivo inválido"));
    } finally {
      setImportando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  };

  const CampoVendedor = ({ prefixo }: { prefixo: string }) => (
    <div className="grid gap-2">
      <Label htmlFor={`${prefixo}-vendedor`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Vendedor Responsável
      </Label>
      <Select
        value={formValues.vendedor}
        onValueChange={(v) => setFormValues({ ...formValues, vendedor: v })}
      >
        <SelectTrigger id={`${prefixo}-vendedor`} className="h-11 border-border">
          <SelectValue placeholder="Selecione o vendedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="proprio">Próprio (cliente da empresa, sem comissão)</SelectItem>
          <SelectItem value="nenhum">Sem vendedor definido</SelectItem>
          {vendedores.map((v: any) => (
            <SelectItem key={v.id} value={v.id}>
              {v.apelido || v.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: "/dashboard" })} className="text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase">GESTÃO DE <span className="text-primary">CLIENTES</span></h2>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Base de dados unificada e histórico comercial.</p>
          </div>
        </div>
        {canWrite && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white">
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">CADASTRAR <span className="text-primary">NOVO CLIENTE</span></DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Razão Social / Nome Fantasia</Label>
                  <Input
                    id="nome"
                    value={formValues.nome}
                    onChange={(e) => setFormValues({...formValues, nome: e.target.value})}
                    className="h-11 border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cnpj" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ / CPF</Label>
                  <Input
                    id="cnpj"
                    value={formValues.cnpj}
                    onChange={(e) => setFormValues({...formValues, cnpj: e.target.value})}
                    className="h-11 border-border font-mono"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endereco" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço Completo</Label>
                  <Input
                    id="endereco"
                    value={formValues.endereco}
                    onChange={(e) => setFormValues({...formValues, endereco: e.target.value})}
                    className="h-11 border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                    <Input
                      id="email"
                      value={formValues.email}
                      onChange={(e) => setFormValues({...formValues, email: e.target.value})}
                      className="h-11 border-border"
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formValues.telefone}
                      onChange={(e) => setFormValues({...formValues, telefone: e.target.value})}
                      className="h-11 border-border"
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                </div>
                <CampoVendedor prefixo="novo" />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="h-11 font-bold uppercase text-[10px] tracking-widest"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate(formValues)}
                  disabled={createMutation.isPending || !formValues.nome}
                  className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-8"
                >
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Confirmar Cadastro
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <Badge variant="outline" className="text-[9px] font-black uppercase">Total</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.total}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clientes Cadastrados</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">Próprio</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.premium}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem comissão</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <History className="h-5 w-5 text-amber-500" />
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">Pendentes</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.inativos}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest">Prospecção</Badge>
            </div>
            <p className="text-2xl font-black text-foreground">{stats.novos}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Novos este mês</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/50 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
                className="pl-10 h-10 border-border bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={mostrarFiltros || filtrosAtivos > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setMostrarFiltros((v) => !v)}
                className="h-10 border-border font-bold uppercase text-[10px] tracking-widest"
              >
                <Filter className={`mr-2 h-4 w-4 ${mostrarFiltros || filtrosAtivos > 0 ? "" : "text-primary"}`} />
                Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
              </Button>
              {canWrite && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={baixarModelo}
                    className="h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                    Modelo
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={importando}
                    onClick={() => inputArquivo.current?.click()}
                    className="h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    {importando ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                    Importar
                  </Button>
                  <input
                    ref={inputArquivo}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importarArquivo(file);
                    }}
                  />
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={exportarClientes}
                className="h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
              </Button>
            </div>
          </div>

          {mostrarFiltros && (
            <div className="mt-4 grid gap-4 rounded-lg border border-border bg-white p-4 md:grid-cols-4">
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status do cadastro</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aprovado">Aprovados</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="reprovado">Reprovados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vendedor</Label>
                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="proprio">Próprio (sem comissão)</SelectItem>
                    <SelectItem value="sem">Sem vendedor definido</SelectItem>
                    {vendedores.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.apelido || v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cadastrado em</Label>
                <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Qualquer data</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="h-10 w-full font-bold uppercase text-[10px] tracking-widest"
                  onClick={() => { setFiltroStatus("todos"); setFiltroVendedor("todos"); setFiltroPeriodo("todos"); }}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent border-b border-border">
                <CabecalhoOrdenavel chave="nome" label="Cliente / Razão Social" className="pl-6" />
                <CabecalhoOrdenavel chave="cnpj" label="CNPJ" />
                <CabecalhoOrdenavel chave="vendedor" label="Vendedor" />
                <CabecalhoOrdenavel chave="cidade" label="Cidade/UF" />
                <CabecalhoOrdenavel chave="criado_em" label="Cadastrado em" />
                <CabecalhoOrdenavel chave="status" label="Status" />
                <TableHead className="py-4 pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Nenhum cliente encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
              {filteredClientes.map((cliente: any) => (
                <TableRow key={cliente.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                        <Building2 className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight flex items-center gap-1.5">
                          {cliente.status_cadastro === 'pendente' && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Cadastro pendente de aprovação" />
                          )}
                          {cliente.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cliente.status_cadastro === 'pendente' ? (
                            <Badge className="bg-amber-500 text-white text-[8px] font-black h-4 uppercase">Pré-cadastro pendente</Badge>
                          ) : cliente.status_cadastro === 'reprovado' ? (
                            <Badge className="bg-red-500 text-white text-[8px] font-black h-4 uppercase">Reprovado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[8px] font-bold h-4">Contrato Ativo</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-[11px] font-mono text-muted-foreground">{cliente.cnpj}</TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-black uppercase tracking-widest ${
                        cliente.venda_propria ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : ''
                      }`}
                    >
                      {nomeVendedor(cliente)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                      <MapPin className="h-3 w-3 text-primary" />
                      {cliente.endereco?.split(',')[0] || "Não informado"}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-xs font-bold text-foreground">
                    {cliente.criado_em ? new Date(cliente.criado_em).toLocaleDateString('pt-BR') : "—"}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={`text-[9px] font-black uppercase tracking-widest ${
                      cliente.status_cadastro === 'pendente' ? 'bg-amber-500 text-white'
                        : cliente.status_cadastro === 'reprovado' ? 'bg-red-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}>{cliente.status_cadastro || 'aprovado'}</Badge>
                  </TableCell>
                  <TableCell className="py-4 pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                        {canWrite && cliente.status_cadastro === 'pendente' && (
                          <>
                            <DropdownMenuItem
                              className="text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 text-emerald-400 cursor-pointer"
                              onClick={() => aprovacaoMutation.mutate({ id: cliente.id, status: 'aprovado' })}
                            >
                              Aprovar Cadastro
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 text-red-400 cursor-pointer"
                              onClick={() => aprovacaoMutation.mutate({ id: cliente.id, status: 'reprovado' })}
                            >
                              Reprovar Cadastro
                            </DropdownMenuItem>
                          </>
                        )}
                        {canWrite && (
                          <DropdownMenuItem
                            className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                            onClick={() => handleEdit(cliente)}
                          >
                            Editar Cliente
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                          onClick={() => router.navigate({ to: `/clientes/${cliente.id}` as any })}
                        >
                          Ver Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer"
                          onClick={() => router.navigate({ to: "/os/nova", search: { cliente_id: cliente.id } as any })}
                        >
                          Nova OS
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 text-red-400 cursor-pointer"
                            onClick={() => handleDelete(cliente)}
                          >
                            Remover Cliente
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black uppercase tracking-tight">EDITAR <span className="text-primary">CLIENTE</span></DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Razão Social / Nome Fantasia</Label>
              <Input
                id="edit-nome"
                value={formValues.nome}
                onChange={(e) => setFormValues({...formValues, nome: e.target.value})}
                className="h-11 border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-cnpj" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ / CPF</Label>
              <Input
                id="edit-cnpj"
                value={formValues.cnpj}
                onChange={(e) => setFormValues({...formValues, cnpj: e.target.value})}
                className="h-11 border-border font-mono"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endereco" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço Completo</Label>
              <Input
                id="edit-endereco"
                value={formValues.endereco}
                onChange={(e) => setFormValues({...formValues, endereco: e.target.value})}
                className="h-11 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                <Input
                  id="edit-email"
                  value={formValues.email}
                  onChange={(e) => setFormValues({...formValues, email: e.target.value})}
                  className="h-11 border-border"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-telefone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={formValues.telefone}
                  onChange={(e) => setFormValues({...formValues, telefone: e.target.value})}
                  className="h-11 border-border"
                  placeholder="(00) 0000-0000"
                />
              </div>
            </div>
            <CampoVendedor prefixo="edit" />
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="h-11 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate({ ...formValues, id: selectedCliente?.id })}
              disabled={updateMutation.isPending || !formValues.nome}
              className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-8"
            >
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
