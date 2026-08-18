import { createFileRoute } from "@tanstack/react-router";
import { 
  ClipboardList, 
  Wrench, 
  Settings, 
  Camera, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  LayoutDashboard,
  Box,
  Truck,
  ShieldCheck,
  History,
  MoreVertical
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/os/$id")({
  component: GestaoOSPage,
});

function GestaoOSPage() {
  const { id } = Route.useParams();
  const [currentStatus, setCurrentStatus] = useState("Triagem");

  const steps = [
    { label: "Triagem", status: "completed" },
    { label: "Vistoria", status: "current" },
    { label: "Orçamento", status: "pending" },
    { label: "Aprovação", status: "pending" },
    { label: "Execução", status: "pending" },
    { label: "Pronto", status: "pending" },
  ];

  return (
    <div className="space-y-8 p-6 md:p-10 pb-20">
      {/* Cabeçalho da OS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Wrench className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-2xl font-black text-foreground tracking-tight uppercase">ORDEM DE SERVIÇO <span className="text-primary">#{id || "1024"}</span></h2>
              <Badge className="bg-amber-500 text-white font-black uppercase text-[9px] tracking-widest">Em Vistoria</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
              Cliente: <span className="text-foreground">Indústria Metalúrgica SA</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              Série: <span className="text-foreground">AH-8890-X</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 border-border font-bold uppercase text-[10px] tracking-widest">
            <Camera className="mr-2 h-4 w-4 text-primary" />
            Anexar Foto
          </Button>
          <Button className="h-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6">
            Avançar Status
            <CheckCircle2 className="ml-2 h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 border border-border">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 text-white border-white/10">
              <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer">Exportar PDF</DropdownMenuItem>
              <DropdownMenuItem className="text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 cursor-pointer text-red-400">Cancelar OS</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Fluxo de Processo (Stepper) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-2 group cursor-default">
            <div className={`h-1.5 w-full rounded-full transition-all ${
              step.status === 'completed' ? 'bg-emerald-500' :
              step.status === 'current' ? 'bg-primary' : 'bg-slate-200'
            }`} />
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
              step.status === 'current' ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-12 p-0 space-x-8 mb-8 overflow-x-auto overflow-y-hidden custom-scrollbar">
          {["Resumo", "Checklist", "Laudo Técnico", "Peças", "Orçamento", "Aprovação", "Auditoria"].map((tab) => (
            <TabsTrigger 
              key={tab} 
              value={tab.toLowerCase().replace(" ", "-")} 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none font-bold uppercase text-[10px] tracking-widest px-0 h-12 transition-all"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-border shadow-md">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest">Informações do Equipamento</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tipo</p>
                    <p className="font-bold text-foreground uppercase">Cilindro Hidráulico</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Modelo / Aplicação</p>
                    <p className="font-bold text-foreground uppercase">Escavadeira CAT 320D - Caçamba</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Solicitação do Cliente</p>
                    <p className="text-muted-foreground font-medium italic">"Vazamento intenso na vedação da haste e perda de força durante a operação."</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md">
              <CardHeader className="bg-muted/10 border-b border-border/50">
                <CardTitle className="text-base font-bold uppercase tracking-widest">SLA e Prazos</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Processo Geral</span>
                    <span>15%</span>
                  </div>
                  <Progress value={15} className="h-2 bg-slate-100" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tempo em Aberto</span>
                  </div>
                  <span className="text-xs font-black text-foreground uppercase">4h 20m</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Previsão</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 uppercase">22/08/2026</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-md overflow-hidden">
             <CardHeader className="bg-slate-900 text-white border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold uppercase tracking-widest">Linha do Tempo (Logs)</CardTitle>
                  </div>
                  <Button variant="ghost" className="text-[10px] font-bold uppercase text-primary">Ver Tudo</Button>
                </div>
             </CardHeader>
             <CardContent className="pt-6 px-0">
                {[
                  { user: "João Silva", action: "Iniciou a Vistoria Técnica", time: "Há 10 min", icon: Wrench },
                  { user: "Sistema", action: "OS-1024 Alterada para status 'Vistoria'", time: "Há 15 min", icon: Settings },
                  { user: "Admin", action: "Criou a Ordem de Serviço", time: "Há 4h", icon: Plus },
                ].map((log, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-border shrink-0">
                      <log.icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{log.user}</p>
                      <p className="text-sm font-bold text-foreground">{log.action}</p>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">{log.time}</span>
                  </div>
                ))}
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
           <Card className="border-border shadow-md">
             <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
               <div>
                 <CardTitle className="text-base font-bold uppercase tracking-widest">Checklist de Entrada</CardTitle>
                 <CardDescription>Verificação visual e física do equipamento.</CardDescription>
               </div>
               <Button className="h-9 bg-primary text-primary-foreground font-bold uppercase text-[10px] tracking-widest px-4">Salvar Checklist</Button>
             </CardHeader>
             <CardContent className="pt-6">
               <div className="space-y-4">
                 {[
                   { item: "Pintura / Carcaça Externa", status: "Aprovado" },
                   { item: "Conexões Hidráulicas", status: "Danificado" },
                   { item: "Parafusos de Fixação", status: "Substituir" },
                   { item: "Haste (Riscos/Empenos)", status: "Aprovado" },
                 ].map((check, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/30">
                     <span className="text-sm font-bold text-foreground uppercase tracking-tight">{check.item}</span>
                     <div className="flex items-center gap-4">
                       <Badge className={`text-[9px] font-black uppercase tracking-widest ${
                         check.status === 'Aprovado' ? 'bg-emerald-500 text-white' : 
                         check.status === 'Danificado' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                       }`}>{check.status}</Badge>
                       <Button variant="outline" size="icon" className="h-8 w-8 border-border text-slate-400">
                         <Camera className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="laudo-técnico">
           <Card className="border-border shadow-md border-l-4 border-l-primary">
             <CardHeader className="bg-muted/10 border-b border-border/50">
               <CardTitle className="text-base font-bold uppercase tracking-widest">Diagnóstico Técnico</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Constatações (Defeitos)</Label>
                    <div className="p-4 rounded-xl border border-border bg-slate-50 min-h-[100px] text-sm font-medium">
                      Gaxetas estouradas devido a contaminação do óleo. Haste apresenta leve desgaste cromo, porém recuperável.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Serviços Propostos</Label>
                    <div className="p-4 rounded-xl border border-border bg-slate-50 min-h-[100px] text-sm font-medium">
                      1. Brunimento interno da camisa.
                      2. Polimento da haste.
                      3. Substituição completa do kit de vedações.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="h-20 w-20 rounded-lg bg-slate-100 border border-border flex items-center justify-center text-slate-300">
                      <Camera className="h-8 w-8" />
                   </div>
                   <div className="h-20 w-20 rounded-lg bg-slate-100 border border-border flex items-center justify-center text-slate-300">
                      <Camera className="h-8 w-8" />
                   </div>
                   <Button variant="outline" className="h-20 w-20 rounded-lg border-2 border-dashed border-border text-slate-400 flex flex-col items-center justify-center gap-1 hover:border-primary hover:text-primary transition-all">
                      <Plus className="h-5 w-5" />
                      <span className="text-[8px] font-bold uppercase">Foto Laudo</span>
                   </Button>
                </div>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="peças">
           <Card className="border-border shadow-md">
             <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                    <Box className="h-5 w-5 text-primary" />
                    Rastreamento de Componentes
                  </CardTitle>
                  <CardDescription>Localização e situação física de cada peça.</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-9 border-primary text-primary hover:bg-primary/5 font-bold text-[10px] uppercase">Registrar Movimentação</Button>
             </CardHeader>
             <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    { peca: "Haste Principal", local: "Gaveta 04-A", status: "Na Bancada", responsavel: "João Silva" },
                    { peca: "Êmbolo", local: "Prateleira C-12", status: "Aguardando Torneiro", responsavel: "Carlos Souza" },
                    { peca: "Cabeçote Guia", local: "Terceirizado (Cromo)", status: "Em Transporte", responsavel: "Transp. Expresso" },
                  ].map((peca, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-border">
                          <Box className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground uppercase tracking-tight">{peca.peca}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                            <MapPin className="h-3 w-3 text-primary" />
                            {peca.local}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                          peca.status === 'Na Bancada' ? 'bg-blue-50 text-blue-600' :
                          peca.status === 'Em Transporte' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
                        }`}>{peca.status}</Badge>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">{peca.responsavel}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Calendar({ className, ...props }: any) {
  return (
    <Clock className={className} {...props} />
  );
}

function MapPin({ className, ...props }: any) {
  return (
    <div className={className} {...props}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </div>
  );
}
