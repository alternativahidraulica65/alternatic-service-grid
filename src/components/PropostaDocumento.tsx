import type { ReactNode } from "react";
import { precoVendaProduto, totalItemProposta, totalProduto } from "@/lib/orcamento-calculos";
import {
  brl,
  num,
  dataBr,
  somarDias,
  type EmpresaSnapshot,
  type VendedorSnapshot,
  type CondicoesProposta,
} from "@/lib/orcamento";

export type DadosProposta = {
  os: any;
  livres: any[];
  empresa: EmpresaSnapshot;
  vendedor: VendedorSnapshot;
  condicoes: CondicoesProposta;
  logo: string | null;
  fotos: any[];
};

export const CONDICOES_PADRAO: CondicoesProposta = {
  prazoEntrega: 10,
  garantia: 90,
  validade: 15,
  pagamento: "",
  observacoes: "",
  comissaoManual: null,
  comissaoVisivel: false,
  precificacaoModo: "valor",
  margemDesejada: 30,
  valorFinalManual: null,
};

/** Documento da proposta comercial em A4 — usado na tela interna e no link público. */
export function PropostaDocumento({ dados, acoes }: { dados: DadosProposta; acoes?: ReactNode }) {
  const { os, livres, empresa, vendedor, condicoes, logo, fotos } = dados;
  const cliente = os?.clientes;

  const linhasServicos = (livres || [])
    .filter((item: any) => (item.tipo_item || "proposta") === "proposta")
    .map((l: any) => ({
      id: l.id as string,
      descricao: l.descricao as string,
      quantidade: num(l.quantidade) || 1,
      unitario: num(l.valor_unitario),
      total: totalItemProposta(l),
    }));

  const linhasProdutos = (livres || [])
    .filter((item: any) => item.tipo_item === "produto")
    .map((l: any) => ({
      id: l.id as string,
      descricao: l.descricao as string,
      quantidade: num(l.quantidade) || 1,
      unitario: precoVendaProduto(l),
      total: totalProduto(l),
    }));

  const subtotal = [...linhasServicos, ...linhasProdutos].reduce((a, l) => a + l.total, 0);
  const total = num(os?.valor_final) > 0 ? num(os.valor_final) : subtotal;
  const ajusteComercial = total - subtotal;

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

      {acoes ? (
        <div className="nao-imprimir mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 px-4">
          {acoes}
        </div>
      ) : null}

      <div className="folha mx-auto w-[210mm] max-w-full bg-white p-10 shadow-xl text-slate-900">
        <header className="flex items-start justify-between gap-6 border-b-4 border-amber-400 pb-4">
          <div className="flex items-start gap-4">
            {logo ? <img src={logo} alt={empresa.nome} className="h-16 w-auto object-contain" /> : null}
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

        {linhasServicos.length > 0 && (
          <section className="quebra mt-6">
            <h2 className="border-l-4 border-amber-400 pl-2 text-[11px] font-black uppercase tracking-widest">
              Serviços da proposta
            </h2>
            <TabelaLinhas linhas={linhasServicos} />
          </section>
        )}

        {linhasProdutos.length > 0 && (
          <section className="quebra mt-6">
            <h2 className="border-l-4 border-amber-400 pl-2 text-[11px] font-black uppercase tracking-widest">
              Produtos
            </h2>
            <TabelaLinhas linhas={linhasProdutos} />
          </section>
        )}

        <section className="quebra mt-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold">{brl(subtotal)}</span>
              </div>
              {Math.abs(ajusteComercial) >= 0.01 && (
                <div className="flex justify-between text-slate-600">
                  <span>Ajuste comercial</span>
                  <span className="font-bold">{brl(ajusteComercial)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-amber-400 pt-2 text-base">
                <span className="font-black uppercase">Total</span>
                <span className="font-black">{brl(total)}</span>
              </div>
            </div>
          </div>
        </section>

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
          {condicoes.comissaoVisivel ? (
            <p className="mt-2 text-[11px] text-slate-700">
              <strong>Comissão do vendedor: </strong>
              {brl(num(condicoes.comissaoExibida))}
            </p>
          ) : null}
        </section>

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

        <footer className="quebra mt-8 flex items-end justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-500">
          <div>
            <p className="font-black uppercase tracking-widest text-slate-700">{vendedor.nome || empresa.nome}</p>
            <p>{[vendedor.telefone, vendedor.email].filter(Boolean).join(" · ")}</p>
          </div>
          <p className="uppercase tracking-widest">{empresa.nome}</p>
        </footer>
      </div>
    </div>
  );
}

function TabelaLinhas({ linhas }: { linhas: Array<{ id: string; descricao: string; quantidade: number; unitario: number; total: number }> }) {
  return (
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
        {linhas.map((l) => (
          <tr key={l.id} className="border-b border-slate-200">
            <td className="p-2 uppercase">{l.descricao}</td>
            <td className="p-2 text-right">{l.quantidade}</td>
            <td className="p-2 text-right">{brl(l.unitario)}</td>
            <td className="p-2 text-right font-bold">{brl(l.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
