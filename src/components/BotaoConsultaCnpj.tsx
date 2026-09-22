import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { consultarCnpj, cnpjValido, type DadosCnpj } from "@/lib/brasilapi";

type Props = {
  /** Valor atual do campo de CNPJ (pode estar formatado). */
  cnpj: string;
  /** Recebe os dados públicos encontrados para preencher o formulário. */
  onDados: (dados: DadosCnpj) => void;
  className?: string;
  rotulo?: string;
};

/**
 * Botão de consulta pública de CNPJ (BrasilAPI) para completar cadastros.
 */
export function BotaoConsultaCnpj({ cnpj, onDados, className, rotulo = "Buscar dados" }: Props) {
  const [carregando, setCarregando] = useState(false);

  const buscar = async () => {
    if (!cnpjValido(cnpj)) {
      toast.error("Digite o CNPJ completo (14 dígitos) para consultar.");
      return;
    }
    setCarregando(true);
    try {
      const dados = await consultarCnpj(cnpj);
      onDados(dados);
      const situacao = dados.situacao ? ` · Situação: ${dados.situacao}` : "";
      toast.success(`${dados.nome || "Empresa"} encontrada.${situacao}`);
    } catch (erro: any) {
      toast.error(erro?.message || "Falha ao consultar o CNPJ.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={buscar}
      disabled={carregando}
      className={className ?? "h-11 shrink-0 gap-2 font-bold uppercase tracking-wider"}
      title="Consultar dados públicos do CNPJ"
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      <span className="hidden sm:inline text-[11px]">{carregando ? "Consultando" : rotulo}</span>
    </Button>
  );
}

export default BotaoConsultaCnpj;
