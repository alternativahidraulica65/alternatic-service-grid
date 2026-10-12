import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface BotaoVoltarProps {
  /** Rota usada quando não existe histórico para voltar (ex.: aba aberta direto no link). */
  to?: string;
  params?: Record<string, string>;
  label?: string;
  className?: string;
}

/**
 * Botão "Voltar" padrão de todas as telas internas.
 * Volta uma etapa no histórico; se não houver histórico, vai para a rota `to` (padrão: dashboard).
 */
export function BotaoVoltar({ to = "/dashboard", params, label = "Voltar", className = "" }: BotaoVoltarProps) {
  const router = useRouter();

  const voltar = () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void router.navigate({ to: to as never, params: params as never });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={voltar}
      className={`gap-1.5 border-border font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
