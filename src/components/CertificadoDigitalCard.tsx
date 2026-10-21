import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Lock, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { salvarCertificado, removerCertificado } from "@/lib/certificado.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cert = { empresa_id: string; titular: string | null; cnpj_certificado: string | null; emissor: string | null; valido_ate: string | null; impressao_digital: string | null; enviado_em: string };

async function token() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Sessão expirada.");
  return data.session.access_token;
}

export function CertificadoDigitalCard() {
  const qc = useQueryClient();
  const salvar = useServerFn(salvarCertificado);
  const remover = useServerFn(removerCertificado);
  const [empresaId, setEmpresaId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas-cert"],
    queryFn: async () => (await supabase.from("empresas_emissoras").select("id, nome, cnpj").eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: certs = [] } = useQuery({
    queryKey: ["certificados-fiscais"],
    queryFn: async () => ((await supabase.from("certificados_fiscais" as never).select("*")).data ?? []) as Cert[],
  });

  async function enviar() {
    if (!empresaId || !arquivo || !senha) {
      toast.error("Selecione a empresa, o arquivo .pfx e informe a senha.");
      return;
    }
    setEnviando(true);
    try {
      const buf = new Uint8Array(await arquivo.arrayBuffer());
      let bin = "";
      buf.forEach((b) => (bin += String.fromCharCode(b)));
      const r = await salvar({ data: { accessToken: await token(), empresaId, pfxBase64: btoa(bin), senha } });
      toast.success(`Certificado guardado no cofre. Válido até ${new Date(r.valido_ate).toLocaleDateString("pt-BR")}.`);
      setArquivo(null); setSenha("");
      qc.invalidateQueries({ queryKey: ["certificados-fiscais"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSenha(""); setEnviando(false);
    }
  }

  async function apagar(id: string) {
    if (!confirm("Remover o certificado desta empresa? A emissão de notas ficará bloqueada.")) return;
    try {
      await remover({ data: { accessToken: await token(), empresaId: id } });
      toast.success("Certificado removido do cofre.");
      qc.invalidateQueries({ queryKey: ["certificados-fiscais"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <ShieldCheck className="h-4 w-4 text-primary" /> Certificado digital A1 (cofre)
        </CardTitle>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Lock className="h-3 w-3 mt-0.5 shrink-0" />
          O arquivo e a senha são criptografados (AES-256) no servidor e nunca podem ser baixados ou lidos por nenhum usuário — nem pelo Diretor.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {certs.map((c) => {
          const emp = empresas.find((e) => e.id === c.empresa_id);
          const dias = c.valido_ate ? Math.ceil((new Date(c.valido_ate).getTime() - Date.now()) / 864e5) : 0;
          return (
            <div key={c.empresa_id} className="flex items-center justify-between gap-3 border rounded-sm p-3">
              <div className="text-xs space-y-0.5 min-w-0">
                <div className="font-bold truncate">{emp?.nome ?? "Empresa"} — {c.titular}</div>
                <div className="text-muted-foreground">Válido até {c.valido_ate ? new Date(c.valido_ate).toLocaleDateString("pt-BR") : "-"} · Impressão {c.impressao_digital}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={dias < 30 ? "destructive" : "secondary"}>{dias} dias</Badge>
                <Button size="icon" variant="ghost" onClick={() => apagar(c.empresa_id)} aria-label="Remover certificado"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Arquivo (.pfx / .p12)</Label>
            <Input type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Senha do certificado</Label>
            <Input type="password" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
        </div>
        <Button onClick={enviar} disabled={enviando}>
          <Upload className="mr-2 h-4 w-4" /> {enviando ? "Validando..." : "Validar e guardar no cofre"}
        </Button>
      </CardContent>
    </Card>
  );
}
