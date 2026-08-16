import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { 
  ArrowLeft,
  Layout,
  Wrench,
  Camera,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/kanban")({
  component: KanbanPage,
  head: () => ({
    meta: [
      { title: "Kanban Operador — Alternativa Hidráulica" },
      { name: "description", content: "Gerenciamento de fila de trabalho e vistoria técnica." },
    ],
  }),
});

const COLUNAS = [
  { id: 'triagem', label: 'Triagem' },
  { id: 'desmontagem', label: 'Desmontagem' },
  { id: 'usinagem', label: 'Em Usinagem' },
  { id: 'montagem', label: 'Montagem' },
  { id: 'pronto', label: 'Pronto' },
];

function KanbanPage() {
  const router = useRouter();
  const { data: orders } = useSuspenseQuery({
    queryKey: ['ordens_servico_kanban'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ordens_servico').select('*');
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 lg:p-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-slate-900">Kanban do Operador</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUNAS.map(coluna => (
          <div key={coluna.id} className="min-w-[280px] flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-bold text-slate-700 uppercase tracking-wider text-xs">{coluna.label}</h2>
              <Badge variant="secondary" className="text-[10px]">{orders?.filter(o => o.status === coluna.id).length || 0}</Badge>
            </div>
            
            <div className="flex flex-col gap-3">
              {orders?.filter(o => o.status === coluna.id).map(order => (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow bg-white p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{order.numero_os}</span>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{order.cliente}</p>
                  <p className="text-sm font-medium text-slate-800 mb-3">{order.descricao}</p>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 bg-amber-50">
                      {new Date(order.criado_em).toLocaleDateString()}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
