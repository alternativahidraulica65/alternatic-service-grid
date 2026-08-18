import { createFileRoute } from "@tanstack/react-router";
import { 
  Shield, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  UserCircle,
  Mail,
  Lock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Key
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const usuarios = [
    { id: 1, nome: "Admin Alternativa", email: "admin@alternativa.com.br", cargo: "Diretor", status: "Ativo", acesso: "Total" },
    { id: 2, nome: "João Silva", email: "joao.silva@alternativa.com.br", cargo: "Operador", status: "Ativo", acesso: "Produção" },
    { id: 3, nome: "Carlos Souza", email: "carlos.souza@alternativa.com.br", cargo: "Gestor", status: "Ativo", acesso: "Gerencial" },
    { id: 4, nome: "Maria Financeiro", email: "financeiro@alternativa.com.br", cargo: "Financeiro", status: "Ativo", acesso: "Financeiro" },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">CONFIGURAÇÕES E <span className="text-primary">CONTROLE</span></h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Gestão de usuários, permissões RBAC e auditoria.</p>
        </div>
        <Button className="h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 shadow-lg shadow-primary/20">
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/50 py-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold uppercase tracking-widest text-foreground">Usuários do Sistema</CardTitle>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar usuário..." 
                    className="pl-9 h-9 border-border bg-white text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Colaborador</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Cargo / Role</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Acesso</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Status</TableHead>
                    <TableHead className="py-4 pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((user) => (
                    <TableRow key={user.id} className="group border-b border-border/50 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-border">
                            <UserCircle className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground uppercase tracking-tight">{user.nome}</p>
                            <p className="text-[10px] font-medium text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-white">
                          {user.cargo}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase">
                           <Key className="h-3 w-3 text-primary" />
                           {user.acesso}
                         </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest border-none">
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
                            <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Editar Permissões</DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Resetar Senha</DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer text-red-400">Desativar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md">
             <CardHeader className="bg-slate-900 text-white border-b border-white/5">
                <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Segurança e Auditoria
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/50">
                   <div className="space-y-0.5">
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">Autenticação de Dois Fatores (2FA)</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Exigir código via app para cargos Administrativos.</p>
                   </div>
                   <Badge variant="outline" className="border-slate-200 text-slate-400 text-[8px] font-black uppercase">Desativado</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/50">
                   <div className="space-y-0.5">
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">Logs de Acesso Sensível</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Auditoria automática de exclusões e alterações financeiras.</p>
                   </div>
                   <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase">Ativo</Badge>
                </div>
             </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-md border-l-4 border-l-primary">
            <CardHeader className="bg-muted/10 border-b border-border/50">
              <CardTitle className="text-base font-bold uppercase tracking-widest">Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome da Unidade / Filial</Label>
                  <Input defaultValue="Matriz Joinville" className="h-10 border-border font-bold uppercase text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CNPJ Principal</Label>
                  <Input defaultValue="12.345.678/0001-90" className="h-10 border-border font-mono text-xs" />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo do Sistema (ERP)</Label>
                   <div className="h-24 w-full rounded-xl border-2 border-dashed border-border bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-all">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Alternativa_Logo.png</span>
                   </div>
                </div>
              </div>
              <Button className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-11">Salvar Alterações</Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-md bg-amber-50 border-amber-200">
             <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                   <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                   <div>
                      <p className="text-xs font-bold text-amber-900 uppercase">Atenção ao RBAC</p>
                      <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                        Alterações de permissões afetam o acesso aos dados financeiros e orçamentos em tempo real.
                      </p>
                   </div>
                </div>
                <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 font-bold uppercase text-[9px] h-9">Ver Matriz de Permissões</Button>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
