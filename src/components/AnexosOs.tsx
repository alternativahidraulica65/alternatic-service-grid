import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIAS: Record<string, string> = {
  nota_fiscal: "Nota fiscal",
  pedido_compra: "Pedido de compra",
  email: "E-mail",
  outros: "Outros",
};

const tamanho = (b?: number | null) =>
  !b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

/** Anexos da OS: qualquer arquivo (notas, pedidos de compra, e-mails...). */
export function AnexosOs({ osId }: { osId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState("outros");
  const [filtro, setFiltro] = useState("todas");

  const { data: anexos = [] } = useQuery({
    queryKey: ["os_anexos", osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_anexos" as any)
        .select("*")
        .eq("os_id", osId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const enviar = useMutation({
    mutationFn: async (files: File[]) => {
      const { data: s } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from("usuarios").select("nome").eq("user_id", s.user?.id ?? "").maybeSingle();
      for (const f of files) {
        const ext = f.name.includes(".") ? f.name.split(".").pop() : "bin";
        const path = `${osId}/anexos/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("os-assets").upload(path, f, f.type ? { contentType: f.type } : {});
        if (up.error) throw up.error;
        const { error } = await supabase.from("os_anexos" as any).insert({
          os_id: osId,
          categoria,
          nome_arquivo: f.name,
          storage_path: path,
          tamanho_bytes: f.size,
          tipo_mime: f.type || null,
          enviado_por: s.user?.id ?? null,
          enviado_por_nome: (perfil as any)?.nome || s.user?.email || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os_anexos", osId] });
      toast.success("Anexo(s) enviado(s)");
    },
    onError: (e: any) => toast.error("Erro ao enviar: " + e.message),
  });

  const remover = useMutation({
    mutationFn: async (a: any) => {
      await supabase.storage.from("os-assets").remove([a.storage_path]);
      const { error } = await supabase.from("os_anexos" as any).delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os_anexos", osId] });
      toast.success("Anexo removido");
    },
    onError: (e: any) => toast.error("Erro ao remover: " + e.message),
  });

  const baixar = async (a: any) => {
    const { data, error } = await supabase.storage.from("os-assets").createSignedUrl(a.storage_path, 300, { download: a.nome_arquivo });
    if (error || !data) { toast.error("Não foi possível abrir o arquivo."); return; }
    window.open(data.signedUrl, "_blank");
  };

  const lista = filtro === "todas" ? anexos : anexos.filter((a) => a.categoria === filtro);

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="bg-muted/10 border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
          <Paperclip className="h-4 w-4 text-primary" /> Anexos ({anexos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) enviar.mutate(files);
              e.target.value = "";
            }}
          />
          <Button
            className="h-9 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest"
            onClick={() => inputRef.current?.click()}
            disabled={enviar.isPending}
          >
            <Upload className="mr-2 h-4 w-4" /> {enviar.isPending ? "Enviando..." : "Adicionar arquivo"}
          </Button>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="ml-auto h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {lista.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nenhum anexo.</p>
        ) : (
          <div className="divide-y divide-border/60 rounded-md border border-border/60">
            {lista.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{a.nome_arquivo}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {CATEGORIAS[a.categoria] || a.categoria} · {tamanho(a.tamanho_bytes)} · {a.enviado_por_nome || "—"} ·{" "}
                    {new Date(a.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Baixar" onClick={() => baixar(a)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remover" onClick={() => remover.mutate(a)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
