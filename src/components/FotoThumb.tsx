import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Camera } from "lucide-react";

const BUCKET = "os-assets";

function extrairPathStorage(url?: string | null): string | null {
  if (!url) return null;
  const marcador = `/${BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) return null;
  const trecho = url.slice(idx + marcador.length);
  return decodeURIComponent(trecho.split("?")[0] ?? trecho);
}

export function useFotoUrl(url?: string | null, storagePath?: string | null) {
  return useQuery({
    queryKey: ["foto_signed_url", storagePath ?? url],
    queryFn: async () => {
      const path = storagePath ?? extrairPathStorage(url);
      if (!path) return url ?? null; // URL externa/normal
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) return url ?? null;
      return data.signedUrl;
    },
    enabled: !!(storagePath ?? url),
    staleTime: 50 * 60 * 1000,
  });
}

interface FotoThumbProps {
  url?: string | null | undefined;
  path?: string | null | undefined;
  alt?: string;
  label?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Miniatura de foto do storage privado com lightbox ao clicar.
 */
export function FotoThumb({ url, path, alt, label, className, imgClassName }: FotoThumbProps) {
  const [aberta, setAberta] = useState(false);
  const { data: src } = useFotoUrl(url, path);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className={
          className ??
          "group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-slate-50"
        }
      >
        {src ? (
          <img
            src={src}
            alt={alt || "Foto"}
            loading="lazy"
            className={
              imgClassName ??
              "h-full w-full object-cover transition-transform group-hover:scale-105"
            }
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
        {label && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
            <p className="text-[8px] font-bold uppercase tracking-widest text-white truncate">
              {label}
            </p>
          </div>
        )}
      </button>

      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-none">
          {src && (
            <img
              src={src}
              alt={alt || "Foto ampliada"}
              className="w-full max-h-[85vh] object-contain rounded-md"
            />
          )}
          {label && (
            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white/70 pb-1">
              {label}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface FotoChecklistProps {
  url?: string | null;
  path?: string | null;
  obrigatoria?: boolean;
  onUpload: () => void;
}

/**
 * Foto de item de checklist: miniatura clicável (lightbox) + botão para trocar,
 * ou botão de envio quando ainda não há foto.
 */
export function FotoChecklist({ url, path, obrigatoria, onUpload }: FotoChecklistProps) {
  if (url || path) {
    return (
      <div className="flex items-center gap-2">
        <FotoThumb
          url={url}
          path={path}
          alt="Foto do item"
          className="h-9 w-9 rounded-md overflow-hidden border border-primary/40 bg-slate-50"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 px-3 border-slate-200"
          onClick={onUpload}
        >
          <Camera className="h-4 w-4" />
          <span className="text-[9px] font-black uppercase tracking-widest">Trocar</span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={`h-9 gap-2 px-3 ${obrigatoria ? 'border-red-500 text-red-500 animate-pulse' : 'border-slate-200'}`}
      onClick={onUpload}
    >
      <Camera className="h-4 w-4" />
      <span className="text-[9px] font-black uppercase tracking-widest">
        {obrigatoria ? 'Foto obrigatória' : 'Foto'}
      </span>
    </Button>
  );
}
