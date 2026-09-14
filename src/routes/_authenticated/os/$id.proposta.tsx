import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  brl,
  num,
  dataBr,
  somarDias,
  carregarFotosOs,
  urlLogo,
  empresaDoCadastro,
  vendedorDoCadastro,
  EMPRESA_VAZIA,
  VENDEDOR_VAZIO,
  type EmpresaSnapshot,
  type VendedorSnapshot,
  type CondicoesProposta,
} from "@/lib/orcamento";

export const Route = createFileRoute("/_authenticated/os/$id/proposta")({
  component: PropostaPage,
});

const CONDICOES_PADRAO: CondicoesProposta = {
  prazoEntrega: 10,
  garantia: 90,
  validade: 15,
  pagamento: "",
  observacoes: "",
  comissaoManual: null,
  comissaoVisivel: false,
};

function PropostaPage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["proposta_pdf", id],
    queryFn: async () => {
      const { data: os, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes ( * ), tipos_equipamento ( nome )")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;

      const [{ data: custos }, { data: livres }, { data: dados }, empresas, fotos] =
        await Promise.all([
          supabase.from("os_custos").select("*").eq("os_id", id).order("criado_em"),
          supabase.from("orcamento_itens" as any).select("*").eq("os_id", id).order("ordem"),
          supabase.from("orcamento_dados" as any).select("*").eq("os_id", id).maybeSingle(),
          supabase.from("empresas_emissoras").select("*").order("criado_em"),
          carregarFotosOs(id),
        ]);

      const listaEmpresas = (empresas.data || []) as any[];
      const empresaCadastro =
        listaEmpresas.find((e) => e.id === (os as any)?.empresa_id) ||
        listaEmpresas.find((e) => e.ativo) ||
        listaEmpresas[0] ||
        null;

      let vendedorCadastro: any = null;
      const vendedorId = (os as any)?.clientes?.vendedor_id;
      if (vendedorId) {
        const { data: v } = await supabase.from("vendedores").select("*").eq("id", vendedorId).maybeSingle();
        vendedorCadastro = v;
      }

      const registro = (dados || null) as any;
      const empresa: EmpresaSnapshot = {
        ...EMPRESA_VAZIA,
        ...empresaDoCadastro(empresaCadastro),
        ...(registro?.empresa_snapshot || {}),
      };
      const vendedor: VendedorSnapshot = {
        ...VENDEDOR_VAZIO,
        ...vendedorDoCadastro(vendedorCadastro),
        ...(registro?.vendedor_snapshot || {}),
      };
      const condicoes: CondicoesProposta = { ...CONDICOES_PADRAO, ...(registro?.condicoes || {}) };
      const selecionadas: string[] = registro?.fotos_selecionadas || [];

      const logo = await urlLogo(empresa.logo_url);

      return {
        os: os as any,
        custos: (custos || []) as any[],
        livres: (livres || []) as any[],
        empresa,
        vendedor,
        condicoes,
        logo,
        fotos: fotos.filter((f: any) => selecionadas.includes(f.id)),
      };
    },
  });

  const pronto = !isLoading && !!data;

  useEffect(() => {
    if (!pronto) return;
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("print")) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [pronto]);

  if (!pronto) {
    return (
      <div className="p-10 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Montando a proposta...
      </div>
    );
  }

  const { os, custos, livres, empresa, vendedor, condicoes, logo, fotos } = data!;
  const cliente = os?.clientes;

  const margemPadrao = num(os?.margem_lucro) || 30;
  const linhasReais = custos.map((c) => {
    const custo = num(c.custo_interno);
    const margem = c.margem_lucro_percentual != null ? num(c.margem_lucro_percentual) : margemPadrao;
    const venda = num(c.preco_venda_final) > 0 ? num(c.preco_venda_final) : custo * (1 + margem / 100);
    return { descricao: c.descricao as string, quantidade: 1, unitario: venda, total: venda };
  });
  const linhasLivres = livres.map((l) => {
    const q = num(l.quantidade) || 1;
    const u = num(l.valor_unitario);
    return { descricao: l.descricao as string, quantidade: q, unitario: u, total: q * u };
  });
  const linhas = [...linhasReais, ...linhasLivres];

  const subtotal = linhas.reduce((a, l) => a + l.total, 0);
  const imposto = num(os?.imposto_aplicado);
  const valorImposto = subtotal * (imposto / 100);
  const total = num(os?.valor_final) > 0 ? num(os.valor_final) : subtotal + valorImposto;

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .nao-imprimir { display: none !important; }
          .folha { box-shadow: none !important; margin: 0 !important; width: auto !important; padding: 0 !important; }
          .quebra { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="nao-imprimir mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <Button asChild variant="ghost" className="text-[10px] font-black uppercase tracking-widest">
          <Link to="/os/$id/orcamento" params={{ id }}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao orçamento
          </Link>
        </Button>
        <Button
          onClick={() => window.print()}
          className="h-10 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"
        >
          <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="folha mx-auto w-[210mm] max-w-full bg-white p-10 shadow-xl text-slate-900">
        {/* Cabeçalho */}
        <header className="flex items-start justify-between gap-6 border-b-4 border-amber-400 pb-4">
          <div className="flex items-start gap-4">
            {logo ? (
              <img src={logo} alt={empresa.nome} className="h-16 w-auto object-contain" />
            ) : null}
            <div>
              <p className="text-base font-black uppercase tracking-tight">{empresa.nome || "—"}</p>
              <p className="text-[11px] text-slate-600">{empresa.razao_social}</p>
              <p className="text-[11px] text-slate-600">CNPJ {empresa.cnpj || "—"}</p>
              {empresa.endereco ? <p className="text-[11px] text-slate-600">{empresa.endereco}</p> : null}
              <p className="text-[11px] text-slate-600">
                {[empresa.telefone, empresa.email, empresa.site].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proposta comercial</p>
            <p className="font-mono text-lg font-black">{os?.numero_os}</p>
            <p className="text-[11px] text-slate-600">Emissão: {dataBr(new Date())}</p>
            <p className="text-[11px] text-slate-600">Validade: {somarDias(condicoes.validade)}</p>
          </div>
        </header>

        {/* Cliente e equipamento */}
        <section className="quebra mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cliente</p>
            <p className="text-sm font-black uppercase">{cliente?.nome || os?.cliente}</p>
            <p className="text-[11px] text-slate-600">CNPJ {cliente?.cnpj || "—"}</p>
            <p className="text-[11px] text-slate-600">{cliente?.endereco || ""}</p>
            <p className="text-[11px] text-slate-600">
              {[cliente?.telefone, cliente?.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Equipamento / OS</p>
            <p className="text-sm font-black uppercase">{os?.tipos_equipamento?.nome || "—"}</p>
            <p className="text-[11px] text-slate-600">{os?.descricao || ""}</p>
          </div>
        </section>

        {/* Laudo */}
        {(os?.laudo_diagnostico || os?.laudo_servicos_necessarios) && (
          <section className="quebra mt-6">
            <h2 className="border-l-4 border-amber-400 pl-2 text-[11px] font-black uppercase tracking-widest">
              Diagnóstico técnico
            </h2>
            {os?.laudo_diagnostico ? (
              <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-700">
                {os.laudo_diagnostico}
              </p>
            ) : null}
            {os?.laudo_servicos_necessarios ? (
              <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-700">
                <strong>Serviços necessários: </strong>
                {os.laudo_servicos_necessarios}
              </p>
            ) : null}
          </section>
        )}

        {/* Itens */}
        <section className="quebra mt-6">
          <h2 className="border-l-4 border-amber-400 pl-2 text-[11px] font-black uppercase tracking-widest">
            Serviços e peças
          </h2>
          <table className="mt-3 w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 text-left font-black uppercase tracking-widest">Descrição</th>
                <th className="w-16 p-2 text-right font-black uppercase tracking-widest">Qtd</th>
                <th className="w-28 p-2 text-right font-black uppercase tracking-widest">Unitário</th>
                <th className="w-28 p-2 text-right font-black uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="p-2 uppercase">{l.descricao}</td>
                  <td className="p-2 text-right">{l.quantidade}</td>
                  <td className="p-2 text-right">{brl(l.unitario)}</td>
                  <td className="p-2 text-right font-bold">{brl(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold">{brl(subtotal)}</span>
              </div>
              {imposto > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Impostos ({imposto}%)</span>
                  <span className="font-bold">{brl(valorImposto)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-amber-400 pt-2 text-base">
                <span className="font-black uppercase">Total</span>
                <span className="font-black">{brl(total)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Condições */}
        <section className="quebra mt-6">
          <h2 className="border-l-4 border-amber-400 pl-2 text-[11px] font-black uppercase tracking-widest">
            Condições comerciais
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
            <Info titulo="Prazo de entrega" valor={`${condicoes.prazoEntrega} dias`} />
            <Info titulo="Garantia" valor={`${condicoes.garantia} dias`} />
            <Info titulo="Validade da proposta" valor={`${condicoes.validade} dias`} />
          </div>
          {condicoes.pagamento ? (
            <p className="mt-3 text-[11px] text-slate-700">
              <strong>Pagamento: </strong>
              {condicoes.pagamento}
            </p>
          ) : null}
          {condicoes.observacoes ? (
            <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">
              {condicoes.observacoes}
            </p>
          ) : null}
          {condicoes.comissaoVisivel && num(condicoes.comissaoManual) >= 0 ? (
            <p className="mt-2 text-[11px] text-slate-700">
              <strong>Comissão do vendedor: </strong>
              {brl(num(condicoes.comissaoManual))}
            </p>
          ) : null}
        </section>

        {/* Fotos */}
        {fotos.length > 0 && (
          <section className="quebra mt-6">
            <h2 className="border-l-4 border-amber-400 pl-2 text-[11px] font-black uppercase tracking-widest">
              Registro fotográfico
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {fotos.map((f: any) => (
                <figure key={f.id} className="quebra overflow-hidden rounded border border-slate-200">
                  <img src={f.url} alt={f.legenda || "Foto da OS"} className="h-32 w-full object-cover" />
                  {f.legenda ? (
                    <figcaption className="p-1 text-center text-[9px] uppercase text-slate-500">
                      {f.legenda}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Rodapé */}
        <footer className="quebra mt-8 flex items-end justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-500">
          <div>
            <p className="font-black uppercase tracking-widest text-slate-700">
              {vendedor.nome || empresa.nome}
            </p>
            <p>{[vendedor.telefone, vendedor.email].filter(Boolean).join(" · ")}</p>
          </div>
          <p className="uppercase tracking-widest">{empresa.nome}</p>
        </footer>
      </div>
    </div>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded border border-slate-200 p-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{titulo}</p>
      <p className="text-[12px] font-black uppercase">{valor}</p>
    </div>
  );
}
