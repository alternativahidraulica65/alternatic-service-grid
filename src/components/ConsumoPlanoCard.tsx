import { useQuery } from "@tanstack/react-query";
import { HardDrive, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const LIMITE_BANCO = 500 * 1024 * 1024;
const LIMITE_STORAGE = 1024 * 1024 * 1024;

type Uso = { banco_bytes: number; storage_bytes: number; arquivos: number; buckets: { nome: string; arquivos: number; bytes: number }[]; tabelas: { nome: string; linhas: number; bytes: number }[]; usuarios_auth: number };

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

function Medidor({ icone, titulo, usado, limite }: { icone: React.ReactNode; titulo: string; usado: number; limite: number }) {
  const pct = Math.min(100, (usado / limite) * 100);
  const cor = pct >= 85 ? "text-destructive" : pct >= 70 ? "text-primary" : "text-foreground";
  return (
    <div className="space-y-2 border rounded-sm p-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
        <span className="flex items-center gap-2">{icone}{titulo}</span>
        <span className={cor}>{pct.toFixed(1)}%</span>
      </div>
      <Progress value={pct} />
      <div className="text-xs text-muted-foreground">{mb(usado)} de {mb(limite)} {pct >= 80 && <b className="text-destructive">· Atenção: perto do limite gratuito</b>}</div>
    </div>
  );
}

export function ConsumoPlanoCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["uso-plano-gratuito"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("uso_plano_gratuito" as never);
      if (error) throw error;
      return data as unknown as Uso;
    },
    refetchInterval: 5 * 60_000,
  });

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest">Consumo do plano gratuito</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {error && <p className="text-xs text-destructive">Não foi possível ler o consumo.</p>}
        {data && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Medidor icone={<Database className="h-3 w-3" />} titulo="Banco de dados" usado={data.banco_bytes} limite={LIMITE_BANCO} />
              <Medidor icone={<HardDrive className="h-3 w-3" />} titulo="Arquivos" usado={data.storage_bytes} limite={LIMITE_STORAGE} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div className="border rounded-sm p-3">
                <div className="font-bold uppercase tracking-widest mb-2">Maiores tabelas</div>
                {data.tabelas.map((t) => <div key={t.nome} className="flex justify-between"><span>{t.nome}</span><span className="text-muted-foreground">{t.linhas} reg · {mb(t.bytes)}</span></div>)}
              </div>
              <div className="border rounded-sm p-3">
                <div className="font-bold uppercase tracking-widest mb-2">Arquivos por pasta · {data.usuarios_auth} usuários</div>
                {data.buckets.map((b) => <div key={b.nome} className="flex justify-between"><span>{b.nome}</span><span className="text-muted-foreground">{b.arquivos} arq · {mb(b.bytes)}</span></div>)}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
