import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Check, CloudOff, RefreshCw, ThumbsDown, ThumbsUp, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { enviarOuEnfileirar, ouvirFila, processarFila, estaOnline } from "@/lib/fila-offline";

export const Route = createFileRoute("/_authenticated/os/$id/oficina")({
  component: ModoOficina,
  head: () => ({
    meta: [
      { title: "Modo Oficina | Alternativa Hidráulica" },
      { name: "description", content: "Checklist e fotos em tela cheia para o técnico na oficina." },
      { property: "og:title", content: "Modo Oficina | Alternativa Hidráulica" },
      { property: "og:description", content: "Checklist e fotos em tela cheia para o técnico na oficina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ItemOficina = {
  id: string | null;
  nome: string;
  estado: string | null;
};

function ModoOficina() {
  const { id: osId } = Route.useParams();
  const queryClient = useQueryClient();
  const [naFila, setNaFila] = useState(0);
  const [online, setOnline] = useState(true);
  const [indice, setIndice] = useState(0);
  const [locais, setLocais] = useState<Record<string, string>>({});
  const [comFoto, setComFoto] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOnline(estaOnline());
    const parar = ouvirFila(setNaFila);
    const aoMudar = () => setOnline(estaOnline());
    window.addEventListener("online", aoMudar);
    window.addEventListener("offline", aoMudar);
    return () => {
      parar();
      window.removeEventListener("online", aoMudar);
      window.removeEventListener("offline", aoMudar);
    };
  }, []);

  const { data: os } = useQuery({
    queryKey: ["oficina_os", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, numero_os, cliente, tipo_equipamento_id, descricao")
        .eq("id", osId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["oficina_checklist", osId, os?.tipo_equipamento_id],
    enabled: !!os,
    queryFn: async () => {
      const { data: salvos, error } = await supabase
        .from("os_checklist_tecnico" as any)
        .select("id, componente, item_peca, estado_atual, estado")
        .eq("os_id", osId);
      if (error) throw error;

      const lista: ItemOficina[] = (salvos || []).map((s: any) => ({
        id: s.id,
        nome: s.item_peca || s.componente,
        estado: s.estado_atual || s.estado || null,
      }));

      if (os?.tipo_equipamento_id) {
        const { data: modelos } = await supabase
          .from("checklist_templates" as any)
          .select("componente_peca, nome, ordem_exibicao")
          .eq("tipo_equipamento_id", os.tipo_equipamento_id)
          .order("ordem_exibicao");
        (modelos || []).forEach((m: any) => {
          const nome = m.componente_peca || m.nome;
          if (nome && !lista.some((i) => i.nome === nome)) lista.push({ id: null, nome, estado: null });
        });
      }
      return lista;
    },
  });

  const total = itens.length;
  const item = itens[indice];
  const estadoAtual = item ? locais[item.nome] ?? item.estado ?? null : null;
  const avaliados = itens.filter((i) => locais[i.nome] ?? i.estado).length;

  const marcar = async (estado: "Bom" | "Ruim") => {
    if (!item) return;
    setLocais((s) => ({ ...s, [item.nome]: estado }));
    const alvo = item;
    const resultado = await enviarOuEnfileirar({
      id: `checklist-${alvo.nome}-${Date.now()}`,
      descricao: `Checklist ${alvo.nome}`,
      executar: async () => {
        if (alvo.id) {
          const { error } = await supabase
            .from("os_checklist_tecnico" as any)
            .update({ estado_atual: estado, estado: estado.toLowerCase() === "bom" ? "aprovado" : "recuperacao" })
            .eq("id", alvo.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("os_checklist_tecnico" as any).insert({
            os_id: osId,
            componente: alvo.nome,
            item_peca: alvo.nome,
            estado_atual: estado,
            estado: estado.toLowerCase() === "bom" ? "aprovado" : "recuperacao",
            tipo_equipamento_id: os?.tipo_equipamento_id ?? null,
          });
          if (error) throw error;
        }
      },
    });
    if (resultado === "na-fila") toast.warning("Sem internet — guardado para enviar depois");
    else queryClient.invalidateQueries({ queryKey: ["oficina_checklist", osId] });
    if (indice < total - 1) setIndice((i) => i + 1);
  };

  const tirarFoto = (arquivo: File | undefined) => {
    if (!arquivo || !item) return;
    const alvo = item;
    setComFoto((s) => ({ ...s, [alvo.nome]: true }));
    void enviarOuEnfileirar({
      id: `foto-${alvo.nome}-${Date.now()}`,
      descricao: `Foto ${alvo.nome}`,
      executar: async () => {
        const ext = arquivo.name.split(".").pop() || "jpg";
        const caminho = `${osId}/checklist/${Date.now()}-${Math.random()}.${ext}`;
        const { error: erroUp } = await supabase.storage.from("os-assets").upload(caminho, arquivo);
        if (erroUp) throw erroUp;
        const { data: urlData } = supabase.storage.from("os-assets").getPublicUrl(caminho);
        const { error } = await supabase.from("fotos_anexos" as any).insert({
          os_id: osId,
          foto_url: urlData.publicUrl,
          storage_path: caminho,
          bucket: "os-assets",
          categoria: `checklist:${alvo.nome}`,
        });
        if (error) throw error;
      },
    }).then((r) => {
      if (r === "na-fila") toast.warning("Foto guardada — sobe quando a internet voltar");
      else toast.success("Foto enviada");
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Sair do modo oficina">
          <Link to="/os/$id" params={{ id: osId }}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate font-mono text-sm font-black">{os?.numero_os || "OS"}</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{os?.cliente}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!online ? <WifiOff className="h-4 w-4 text-destructive" /> : null}
          {naFila > 0 ? (
            <Badge className="bg-amber-400 text-slate-900 text-[10px] font-black">
              <CloudOff className="mr-1 h-3 w-3" /> {naFila}
            </Badge>
          ) : null}
        </div>
      </header>

      <div className="h-1 w-full bg-muted">
        <div
          className="h-1 bg-primary transition-all"
          style={{ width: total ? `${(avaliados / total) * 100}%` : "0%" }}
        />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item de checklist para esta OS.</p>
        ) : (
          <>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Item {indice + 1} de {total} · {avaliados} avaliados
            </p>
            <h1 className="text-3xl font-black uppercase leading-tight">{item?.nome}</h1>
            {estadoAtual ? (
              <Badge className={estadoAtual === "Bom" ? "bg-emerald-600 text-white" : "bg-destructive text-white"}>
                {estadoAtual}
              </Badge>
            ) : null}

            <div className="grid w-full max-w-md grid-cols-2 gap-4">
              <Button
                className="h-28 bg-emerald-600 text-lg font-black uppercase text-white hover:bg-emerald-500"
                onClick={() => marcar("Bom")}
              >
                <ThumbsUp className="mr-2 h-7 w-7" /> Bom
              </Button>
              <Button
                variant="destructive"
                className="h-28 text-lg font-black uppercase"
                onClick={() => marcar("Ruim")}
              >
                <ThumbsDown className="mr-2 h-7 w-7" /> Ruim
              </Button>
            </div>

            <label className="flex h-20 w-full max-w-md cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/60 text-base font-black uppercase tracking-widest text-primary">
              <Camera className="h-6 w-6" />
              {item && comFoto[item.nome] ? "Foto registrada · tirar outra" : "Tirar foto"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  tirarFoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="flex w-full max-w-md gap-3">
              <Button
                variant="outline"
                className="h-14 flex-1 text-sm font-black uppercase"
                disabled={indice === 0}
                onClick={() => setIndice((i) => Math.max(0, i - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                className="h-14 flex-1 text-sm font-black uppercase"
                disabled={indice >= total - 1}
                onClick={() => setIndice((i) => Math.min(total - 1, i + 1))}
              >
                Próximo
              </Button>
            </div>
          </>
        )}
      </main>

      <footer className="flex items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
        <Button
          variant="ghost"
          className="text-[10px] font-black uppercase tracking-widest"
          onClick={async () => {
            const enviadas = await processarFila();
            toast.success(enviadas > 0 ? `${enviadas} envio(s) concluído(s)` : "Nada pendente na fila");
            queryClient.invalidateQueries({ queryKey: ["oficina_checklist", osId] });
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Enviar pendências ({naFila})
        </Button>
        <Button asChild className="h-11 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
          <Link to="/os/$id" params={{ id: osId }}>
            <Check className="mr-2 h-4 w-4" /> Concluir
          </Link>
        </Button>
      </footer>
    </div>
  );
}
