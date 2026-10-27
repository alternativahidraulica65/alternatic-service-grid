import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Receipt, AlertTriangle, CheckCircle2, FlaskConical, FileText, Trash2, ShieldCheck, Send, Download, Eye, Ban } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { transmitirNota, cancelarNota } from "@/lib/transmissao-fiscal.functions";
import { obterUrlDocumentoFiscal } from "@/lib/documento-fiscal.functions";
import { toast } from "sonner";
import {
  CSOSN_RETORNO, NATUREZA_RETORNO, TEXTO_SEM_REMESSA, NCM_PADRAO_CILINDRO, cfopRetorno, itensServico, pendenciasEmissao, totalItens, type TipoNota,
} from "@/lib/emissao-fiscal";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const db = supabase as any;

const STATUS: Record<string, string> = {
  rascunho: "Aguardando transmissão", processando: "Transmitindo", autorizada: "Autorizada",
  rejeitada: "Rejeitada", cancelada: "Cancelada", denegada: "Denegada",
};

export function EmissaoFiscalOs({ osId }: { osId: string }) {
  const qc = useQueryClient();
  const key = ["emissao-fiscal", osId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: os } = await db.from("ordens_servico")
        .select("id, numero_os, cliente_id, empresa_id, valor_final, valor_total, descricao, nf_entrada_numero, nf_entrada_serie, nf_entrada_chave, nf_entrada_data, nf_entrada_valor")
        .eq("id", osId).maybeSingle();
      const [cli, emps, itens, notas, certs] = await Promise.all([
        os?.cliente_id ? db.from("clientes").select("*").eq("id", os.cliente_id).maybeSingle() : { data: null },
        db.from("empresas_emissoras").select("*").eq("ativo", true).order("nome"),
        db.from("orcamento_itens").select("descricao, quantidade, valor_unitario, tipo_item").eq("os_id", osId).order("ordem"),
        db.from("notas_fiscais").select("*").eq("os_id", osId).order("created_at", { ascending: false }),
        db.from("certificados_fiscais").select("empresa_id, valido_ate"),
      ]);
      return { os, cliente: cli.data, empresas: emps.data || [], itens: itens.data || [], notas: notas.data || [], certs: certs.data || [] };
    },
  });

  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoNota>("nfse");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [obs, setObs] = useState("");
  const [entrada, setEntrada] = useState({ numero: "", serie: "", chave: "", data: "", valor: "", semRemessa: false });
  const [enviando, setEnviando] = useState(false);
  const [teste, setTeste] = useState(false);

  const empresa = useMemo(
    () => data?.empresas.find((e: any) => e.id === (empresaId || data?.os?.empresa_id)) || data?.empresas[0],
    [data, empresaId],
  );
  const cert = data?.certs.find((c: any) => c.empresa_id === empresa?.id);
  const servicos = itensServico(data?.itens || []);
  const valorServicos = totalItens(servicos);
  const osComEntrada = {
    ...data?.os,
    nf_entrada_numero: entrada.numero, nf_entrada_chave: entrada.chave, nf_entrada_valor: Number(entrada.valor.replace(",", ".")),
    sem_remessa: entrada.semRemessa,
  };
  const pend = data ? pendenciasEmissao({
    tipo, empresa, cliente: data.cliente, os: osComEntrada, temCertificado: !!cert, certificadoValidoAte: cert?.valido_ate, valorServicos: tipo === "nfse" && teste ? 1 : valorServicos,
  }) : [];
  const cfop = cfopRetorno(empresa?.uf, data?.cliente?.uf);
  const homolog = (empresa?.ambiente_fiscal || "homologacao") !== "producao";

  const abrir = (t: TipoNota) => {
    const o = data?.os || {};
    setTipo(t); setTeste(false); setEmpresaId(o.empresa_id || data?.empresas[0]?.id || ""); setObs("");
    setEntrada({
      numero: o.nf_entrada_numero || "", serie: o.nf_entrada_serie || "", chave: o.nf_entrada_chave || "",
      data: o.nf_entrada_data || "", valor: o.nf_entrada_valor != null ? String(o.nf_entrada_valor).replace(".", ",") : "",
      semRemessa: o.nf_entrada_valor != null && !o.nf_entrada_chave,
    });
    setAberto(true);
  };

  const preparar = async () => {
    if (pend.length) return;
    setEnviando(true);
    try {
      const sem = entrada.semRemessa;
      const chave = sem ? "" : entrada.chave.replace(/\D/g, "");
      if (tipo === "nfe") {
        const { error } = await db.from("ordens_servico").update({
          nf_entrada_numero: sem ? null : entrada.numero.trim(), nf_entrada_serie: sem ? null : entrada.serie.trim() || null,
          nf_entrada_chave: sem ? null : chave, nf_entrada_data: sem ? null : entrada.data || null,
          nf_entrada_valor: Number(entrada.valor.replace(",", ".")),
        }).eq("id", osId);
        if (error) throw error;
      }
      const c = data!.cliente;
      const itens = tipo === "nfse" && teste
        ? [{ descricao: "Serviço de teste - validação de integração do sistema emissor", quantidade: 1, valor_unitario: 1, codigo_tributacao: empresa.nfse_codigo_tributacao, nbs: empresa.nfse_codigo_nbs }]
        : tipo === "nfse"
        ? servicos.map((i: any) => ({ descricao: i.descricao, quantidade: Number(i.quantidade), valor_unitario: Number(i.valor_unitario), codigo_tributacao: empresa.nfse_codigo_tributacao, nbs: empresa.nfse_codigo_nbs }))
        : [{ descricao: data!.os.descricao || `Equipamento da OS ${data!.os.numero_os}`, quantidade: 1, valor_unitario: osComEntrada.nf_entrada_valor, ncm: NCM_PADRAO_CILINDRO, cfop, csosn: CSOSN_RETORNO }];
      const valor = tipo === "nfse" ? (teste ? 1 : valorServicos) : osComEntrada.nf_entrada_valor;
      const snapshot = {
        emitente: { cnpj: empresa.cnpj, razao_social: empresa.razao_social, ie: empresa.inscricao_estadual, im: empresa.inscricao_municipal, regime: empresa.regime_tributario, logradouro: empresa.logradouro, numero: empresa.numero, bairro: empresa.bairro, cidade: empresa.cidade, uf: empresa.uf, cep: empresa.cep, codigo_ibge: empresa.codigo_ibge },
        destinatario: { documento: c.cnpj, razao_social: c.razao_social || c.nome, tipo_pessoa: c.tipo_pessoa, indicador_ie: c.indicador_ie, ie: c.inscricao_estadual, im: c.inscricao_municipal, email: c.email_fiscal || c.email, logradouro: c.logradouro, numero: c.numero, complemento: c.complemento, bairro: c.bairro, cidade: c.cidade, uf: c.uf, cep: c.cep, codigo_ibge: c.codigo_ibge },
        nf_entrada: tipo === "nfe" ? (sem ? { sem_remessa: true } : { numero: entrada.numero, serie: entrada.serie, chave, data: entrada.data }) : null,
      };
      const obsFinal = [tipo === "nfe" && sem ? TEXTO_SEM_REMESSA : "", obs.trim()].filter(Boolean).join(" · ");
      const { error } = await db.rpc("reservar_nota_fiscal", {
        p_os_id: osId, p_empresa_id: empresa.id, p_tipo: tipo, p_cfop: tipo === "nfe" ? cfop : null,
        p_natureza: tipo === "nfe" ? NATUREZA_RETORNO : "Prestação de serviço de manutenção e reparo",
        p_valor: valor, p_itens: itens, p_snapshot: snapshot,
        p_nf_entrada: tipo === "nfe" && chave ? chave : null, p_observacoes: obsFinal || null,
      });
      if (error) throw error;
      toast.success("Nota preparada e número reservado.");
      setAberto(false);
      qc.invalidateQueries({ queryKey: key });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao preparar a nota.");
    } finally { setEnviando(false); }
  };

  const cancelarFn = useServerFn(cancelarNota);
  const cancelar = async (n: any) => {
    const motivo = window.prompt(`Cancelar a NFS-e nº ${n.numero}? Informe o motivo (mín. 15 letras):`, "Nota emitida para teste de integração do sistema");
    if (!motivo) return;
    if (motivo.trim().length < 15) { toast.error("O motivo precisa ter pelo menos 15 letras."); return; }
    const id = toast.loading("Cancelando na prefeitura…");
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) throw new Error("Sessão expirada.");
      const r = await cancelarFn({ data: { accessToken: s.session.access_token, notaId: n.id, motivo: motivo.trim() } });
      if (r.cancelada) toast.success("Nota cancelada.", { id });
      else toast.error(`Cancelamento recusado: ${r.motivo}`, { id });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao cancelar.", { id });
    } finally { qc.invalidateQueries({ queryKey: key }); }
  };

  const transmitirFn = useServerFn(transmitirNota);
  const [transmitindo, setTransmitindo] = useState<string | null>(null);
  const transmitir = async (id: string) => {
    setTransmitindo(id);
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) throw new Error("Sessão expirada.");
      const r = await transmitirFn({ data: { accessToken: s.session.access_token, notaId: id } });
      if (r.autorizada) toast.success("Nota autorizada! XML e PDF disponíveis.");
      else toast.error(`Rejeitada: ${r.motivo}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha na transmissão.");
    } finally {
      setTransmitindo(null);
      qc.invalidateQueries({ queryKey: key });
    }
  };
  const urlFn = useServerFn(obterUrlDocumentoFiscal);
  const [visualizar, setVisualizar] = useState<{ url: string; nome: string } | null>(null);
  const salvarArquivo = (url: string, nome: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const baixar = async (path: string, ver: boolean) => {
    const id = toast.loading("Carregando arquivo…");
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) throw new Error("Sessão expirada.");
      const { base64, mime, nome } = await urlFn({ data: { accessToken: s.session.access_token, path } });
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      toast.dismiss(id);
      if (ver) { setVisualizar({ url, nome }); return; }
      salvarArquivo(url, nome);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success("Download iniciado.");
    } catch (e: any) {
      toast.error(e?.message || "Arquivo indisponível.", { id });
    }
  };

  const descartar = async (id: string) => {
    const { error } = await db.rpc("descartar_nota_fiscal", { p_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Rascunho descartado.");
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base font-bold uppercase tracking-widest flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" /> Documentos fiscais
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="font-black uppercase tracking-widest text-[10px]" onClick={() => abrir("nfse")} disabled={isLoading}>
            <FileText className="mr-2 h-4 w-4" /> Emitir NFS-e (serviço)
          </Button>
          <Button size="sm" variant="outline" className="font-bold uppercase tracking-widest text-[10px]" onClick={() => abrir("nfe")} disabled={isLoading}>
            <FileText className="mr-2 h-4 w-4 text-primary" /> Emitir NF-e retorno
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {homolog && (
          <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-widest">
            <FlaskConical className="h-4 w-4 text-primary" /> Ambiente de homologação — notas sem valor fiscal
          </div>
        )}
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : !data?.notas.length ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Receipt className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma nota para esta OS.</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {data.notas.map((n: any) => (
              <div key={n.id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm">
                <Badge variant="outline" className="font-black uppercase">{n.tipo === "nfe" ? "NF-e" : "NFS-e"}</Badge>
                <span className="font-bold">Nº {n.numero} · Série {n.serie}</span>
                {n.cfop && <span className="text-xs text-muted-foreground">CFOP {n.cfop}</span>}
                <Badge variant={n.ambiente === "producao" ? "default" : "secondary"} className="uppercase text-[9px]">
                  {n.ambiente === "producao" ? "Produção" : "Homologação"}
                </Badge>
                <span className="text-xs font-semibold">{STATUS[n.status] || n.status}</span>
                <span className="ml-auto font-black">{brl(n.valor_total)}</span>
                {["rascunho", "rejeitada"].includes(n.status) && (
                  <Button size="sm" className="h-8 font-black uppercase tracking-widest text-[10px]" disabled={transmitindo === n.id} onClick={() => transmitir(n.id)}>
                    <Send className="mr-1 h-3.5 w-3.5" /> {transmitindo === n.id ? "Transmitindo…" : n.status === "rejeitada" ? "Reenviar" : "Transmitir"}
                  </Button>
                )}
                {n.xml_path && (
                  <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" onClick={() => baixar(n.xml_path, false)}>
                    <Download className="mr-1 h-3.5 w-3.5" /> XML
                  </Button>
                )}
                {n.pdf_path && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" onClick={() => baixar(n.pdf_path, true)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Ver DANFE
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase" onClick={() => baixar(n.pdf_path, false)}>
                      <Download className="mr-1 h-3.5 w-3.5" /> PDF
                    </Button>
                  </>
                )}
                {n.status === "autorizada" && n.tipo === "nfse" && (
                  <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-destructive" onClick={() => cancelar(n)}>
                    <Ban className="mr-1 h-3.5 w-3.5" /> Cancelar
                  </Button>
                )}
                {n.status === "rascunho" && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Descartar rascunho" onClick={() => descartar(n.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {n.chave_acesso && <p className="w-full font-mono text-[10px] text-muted-foreground break-all">Chave {n.chave_acesso}</p>}
                {n.motivo_status && <p className="w-full text-[11px] text-muted-foreground">{n.motivo_status}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-widest text-sm font-black">
              {tipo === "nfse" ? "NFS-e — Prestação de serviço" : `NF-e — Retorno de conserto (CFOP ${cfop})`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Empresa emissora</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3" value={empresa?.id || ""} onChange={(e) => setEmpresaId(e.target.value)}>
                {data?.empresas.map((e: any) => <option key={e.id} value={e.id}>{e.nome} — {e.cnpj}</option>)}
              </select>
              {empresa && (
                <p className="text-[11px] text-muted-foreground">
                  Série {tipo === "nfe" ? empresa.nfe_serie : empresa.nfse_serie} · próximo nº {homolog ? "de teste" : "real"}{" "}
                  {tipo === "nfe"
                    ? (homolog ? empresa.nfe_proximo_numero_homolog : empresa.nfe_proximo_numero)
                    : (homolog ? empresa.nfse_proximo_numero_homolog : empresa.nfse_proximo_numero)}
                  {" "}· {homolog ? "Homologação" : "PRODUÇÃO"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-border p-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tomador / Destinatário</p>
                <p className="font-bold">{data?.cliente?.razao_social || data?.cliente?.nome || "—"}</p>
                <p className="text-xs">{data?.cliente?.cnpj || "Sem documento"}</p>
                <p className="text-xs text-muted-foreground">{[data?.cliente?.cidade, data?.cliente?.uf].filter(Boolean).join(" - ")}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tributação</p>
                {tipo === "nfse" ? (
                  <p className="text-xs">Cód. {empresa?.nfse_codigo_tributacao || "—"} · NBS {empresa?.nfse_codigo_nbs || "—"} · ISS {empresa?.cidade || ""}</p>
                ) : (
                  <p className="text-xs">CFOP {cfop} · CSOSN {CSOSN_RETORNO} · NCM {NCM_PADRAO_CILINDRO} · sem ICMS/IPI</p>
                )}
              </div>
            </div>

            {tipo === "nfse" && (
              <label className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-xs font-semibold">
                <input type="checkbox" className="mt-0.5" checked={teste} onChange={(e) => setTeste(e.target.checked)} />
                <span>Emitir nota de teste de R$ 1,00 (o orçamento da OS não muda). Depois de autorizada, cancele e emita a nota com o valor real.</span>
              </label>
            )}
            {tipo === "nfse" && teste ? (
              <div className="flex justify-between rounded-md border border-border px-3 py-2 text-xs font-black">
                <span>Serviço de teste - validação de integração</span><span>{brl(1)}</span>
              </div>
            ) : tipo === "nfse" ? (
              <div className="rounded-md border border-border">
                {servicos.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Sem serviços no orçamento desta OS.</p>
                ) : servicos.map((i: any, idx: number) => (
                  <div key={idx} className="flex justify-between px-3 py-2 text-xs border-b border-border last:border-0">
                    <span>{Number(i.quantidade)} × {i.descricao}</span>
                    <span className="font-bold">{brl(Number(i.quantidade) * Number(i.valor_unitario))}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 font-black bg-muted/20">
                  <span>Total dos serviços</span><span>{brl(valorServicos)}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest">NF de entrada (com que o cliente enviou a peça)</p>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input type="checkbox" checked={entrada.semRemessa} onChange={(e) => setEntrada({ ...entrada, semRemessa: e.target.checked })} />
                  Equipamento recebido sem nota de remessa
                </label>
                {entrada.semRemessa ? (
                  <div className="space-y-1">
                    <Input placeholder="Valor estimado do equipamento (R$)" inputMode="decimal" value={entrada.valor} onChange={(e) => setEntrada({ ...entrada, valor: e.target.value })} />
                    <p className="text-[11px] text-muted-foreground">A nota sai sem referência e com a observação: "{TEXTO_SEM_REMESSA}".</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input placeholder="Número" value={entrada.numero} onChange={(e) => setEntrada({ ...entrada, numero: e.target.value })} />
                      <Input placeholder="Série" value={entrada.serie} onChange={(e) => setEntrada({ ...entrada, serie: e.target.value })} />
                      <Input type="date" value={entrada.data} onChange={(e) => setEntrada({ ...entrada, data: e.target.value })} />
                      <Input placeholder="Valor (R$)" inputMode="decimal" value={entrada.valor} onChange={(e) => setEntrada({ ...entrada, valor: e.target.value })} />
                    </div>
                    <Input placeholder="Chave de acesso (44 dígitos)" className="font-mono" value={entrada.chave}
                      onChange={(e) => setEntrada({ ...entrada, chave: e.target.value.replace(/\D/g, "").slice(0, 44) })} />
                  </>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Informações complementares</Label>
              <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder={`Referente à OS ${data?.os?.numero_os || ""}`} />
            </div>

            {pend.length > 0 ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Corrija antes de emitir
                </p>
                <ul className="mt-2 list-disc pl-5 text-xs space-y-0.5">{pend.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-xs font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" /> Dados completos para emissão.
              </p>
            )}
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0" /> A nota é gravada com número reservado. Depois clique em "Transmitir" na lista para assinar com o certificado e enviar.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={preparar} disabled={enviando || pend.length > 0} className="font-black uppercase tracking-widest text-[10px]">
              {enviando ? "Gravando…" : homolog ? "Preparar nota de teste" : "Preparar nota real"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!visualizar} onOpenChange={(o) => { if (!o) { if (visualizar) URL.revokeObjectURL(visualizar.url); setVisualizar(null); } }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{visualizar?.nome}</DialogTitle></DialogHeader>
          {visualizar && <iframe src={visualizar.url} title="DANFE" className="h-[75vh] w-full rounded-sm border border-border" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => visualizar && salvarArquivo(visualizar.url, visualizar.nome)}>
              <Download className="mr-2 h-4 w-4" /> Baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
