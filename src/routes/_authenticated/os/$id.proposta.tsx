import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PropostaDocumento, CONDICOES_PADRAO } from "@/components/PropostaDocumento";
import {
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
  head: () => ({
    meta: [
      { title: "Proposta Comercial | Alternativa Hidráulica" },
      { name: "description", content: "Proposta comercial da ordem de serviço pronta para impressão." },
      { property: "og:title", content: "Proposta Comercial | Alternativa Hidráulica" },
      { property: "og:description", content: "Proposta comercial da ordem de serviço pronta para impressão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

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

      const [{ data: livres }, { data: dados }, empresas, fotos] = await Promise.all([
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

  // Ao imprimir, o orçamento passa a "gerado" e a OS segue para aprovação do cliente.
  const imprimir = async () => {
    const os = data?.os;
    if (os && !os.orcamento_enviado_em) {
      const agora = new Date().toISOString();
      const updates: any = { orcamento_enviado_em: agora };
      if (os.status === "orcamento_pendente") updates.status_financeiro = "aguardando aprovação";
      const { error } = await supabase.from("ordens_servico").update(updates).eq("id", id);
      if (!error) {
        const { data: u } = await supabase.auth.getUser();
        await supabase.from("historico_status_os" as any).insert({
          os_id: id,
          status_anterior: os.status,
          status_novo: os.status,
          observacao: "Orçamento gerado (impresso) — aguardando aprovação do cliente",
          executor_id: u.user?.id ?? null,
          executor_email: u.user?.email ?? null,
        });
        os.orcamento_enviado_em = agora;
      }
    }
    window.print();
  };

  useEffect(() => {
    if (!pronto) return;
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("print")) return;
    const t = setTimeout(() => void imprimir(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto]);

  if (!pronto) {
    return (
      <div className="p-10 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Montando a proposta...
      </div>
    );
  }

  return (
    <PropostaDocumento
      dados={data!}
      acoes={
        <>
          <Button asChild variant="ghost" className="text-[10px] font-black uppercase tracking-widest">
            <Link to="/os/$id/orcamento" params={{ id }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao orçamento
            </Link>
          </Button>
          <Button
            onClick={() => void imprimir()}
            className="h-10 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"
          >
            <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </>
      }
    />
  );
}
