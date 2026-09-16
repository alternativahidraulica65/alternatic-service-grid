import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropostaDocumento, CONDICOES_PADRAO } from "@/components/PropostaDocumento";
import { carregarPropostaPublica } from "@/lib/proposta-publica.functions";
import { EMPRESA_VAZIA, VENDEDOR_VAZIO } from "@/lib/orcamento";

export const Route = createFileRoute("/proposta/$token")({
  component: PropostaPublica,
  head: () => ({
    meta: [
      { title: "Proposta Comercial | Alternativa Hidráulica" },
      { name: "description", content: "Proposta comercial enviada pela Alternativa Hidráulica." },
      { property: "og:title", content: "Proposta Comercial | Alternativa Hidráulica" },
      { property: "og:description", content: "Proposta comercial enviada pela Alternativa Hidráulica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PropostaPublica() {
  const { token } = Route.useParams();
  const carregar = useServerFn(carregarPropostaPublica);

  const { data, isLoading } = useQuery({
    queryKey: ["proposta_publica", token],
    queryFn: () => carregar({ data: { token } }),
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Carregando proposta...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-black uppercase tracking-widest text-slate-700">Proposta não encontrada</p>
        <p className="mt-2 text-[12px] text-slate-500">
          O link pode ter sido cancelado. Fale com o seu contato comercial.
        </p>
      </div>
    );
  }

  const dados = {
    os: data.os,
    livres: data.livres || [],
    empresa: { ...EMPRESA_VAZIA, ...(data.empresa as any) },
    vendedor: { ...VENDEDOR_VAZIO, ...(data.vendedor as any) },
    condicoes: { ...CONDICOES_PADRAO, ...(data.condicoes as any) },
    logo: data.logo,
    fotos: data.fotos || [],
  };

  return (
    <PropostaDocumento
      dados={dados}
      acoes={
        <Button
          onClick={() => window.print()}
          className="ml-auto h-10 bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-amber-300"
        >
          <Printer className="mr-2 h-4 w-4" /> Salvar em PDF
        </Button>
      }
    />
  );
}
