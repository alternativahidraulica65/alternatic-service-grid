import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Download, 
  Clock, 
  Printer, 
  Share2,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/orcamento/pdf")({
  head: () => ({ meta: [
    { title: "Documento de orçamento — Alternativa Hidráulica" },
    { name: "description", content: "Documento comercial para apresentação do orçamento ao cliente." },
    { property: "og:title", content: "Documento de orçamento — Alternativa Hidráulica" },
    { property: "og:description", content: "Documento comercial para apresentação do orçamento ao cliente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GeradorPdfPage,
});

function GeradorPdfPage() {
  const { data: orders } = useSuspenseQuery({
    queryKey: ['ordens_servico_orcamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, empresas_emissoras(nome, cnpj)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const getSLA = (dataCriacao: string | null) => {
    if (!dataCriacao) return 0;
    const start = new Date(dataCriacao);
    const end = new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Gerador de Propostas (PDF)</h2>
          <p className="text-sm text-slate-500">Documentação técnica e comercial para o cliente.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {orders?.map(os => {
          const diasAberto = getSLA(os.criado_em);
          return (
            <Card key={os.id} className="group hover:border-primary transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-slate-900">{os.numero_os}</span>
                        <Badge variant="outline" className={diasAberto > 5 ? "text-red-500 border-red-200" : "text-emerald-500 border-emerald-200"}>
                          SLA: {diasAberto} dias
                        </Badge>
                      </div>
                      <h3 className="font-bold text-slate-900">{os.cliente}</h3>
                      <p className="text-xs text-slate-500">{os.descricao}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button className="h-9 btn-industrial">
                      <Download className="h-4 w-4 mr-2" />
                      Gerar PDF
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview do Layout do PDF (Mock visual) */}
      <Card className="border-2 border-dashed border-slate-200 bg-white shadow-2xl max-w-[800px] mx-auto hidden lg:block">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-black font-black text-xl">A</span>
              </div>
              <div>
                <h4 className="font-display font-black text-slate-900 uppercase tracking-tighter">Alternativa Hidráulica</h4>
                <p className="text-[10px] text-slate-500">Manutenção e Fabricação de Cilindros Hidráulicos</p>
              </div>
            </div>
            <div className="text-right">
              <h4 className="font-mono text-lg font-bold">ORÇAMENTO #PROTÓTIPO</h4>
              <p className="text-[10px] text-slate-400">Emitido em: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10 space-y-8 min-h-[600px]">
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Dados do Cliente</p>
              <p className="font-bold text-slate-900">Cliente Exemplo LTDA</p>
              <p className="text-xs text-slate-600">CNPJ: 00.000.000/0000-00</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Equipamento</p>
              <p className="font-bold text-slate-900">Cilindro Hidráulico Principal</p>
              <p className="text-xs text-slate-600">Modelo: H-500 Custom</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h5 className="font-bold text-sm text-slate-900 border-l-4 border-primary pl-2">DETALHAMENTO DE SERVIÇOS E PEÇAS</h5>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="p-3 text-left">DESCRIÇÃO DO ITEM</th>
                    <th className="p-3 text-right">QTD</th>
                    <th className="p-3 text-right">UNITÁRIO</th>
                    <th className="p-3 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-3">JOGO DE VEDAÇÕES POLIURETANO 4"</td>
                    <td className="p-3 text-right">01</td>
                    <td className="p-3 text-right">R$ 450,00</td>
                    <td className="p-3 text-right font-bold">R$ 450,00</td>
                  </tr>
                  <tr>
                    <td className="p-3">SERVIÇO DE USINAGEM (RECUPERAÇÃO DE HASTE)</td>
                    <td className="p-3 text-right">01</td>
                    <td className="p-3 text-right">R$ 1.200,00</td>
                    <td className="p-3 text-right font-bold">R$ 1.200,00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-10">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-bold">R$ 1.650,00</span>
              </div>
              <div className="flex justify-between text-lg border-t-2 border-primary pt-2">
                <span className="font-black">TOTAL:</span>
                <span className="font-black text-slate-900">R$ 1.650,00</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}