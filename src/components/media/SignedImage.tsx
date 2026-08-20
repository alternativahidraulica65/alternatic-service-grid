import { useEffect, useState } from "react";
import { getSignedUrl, OS_MEDIA_BUCKET } from "@/lib/media/upload";

interface SignedImageProps {
  storagePath?: string | null;
  fallbackUrl?: string | null;
  bucket?: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
}

/**
 * Exibe imagens de buckets privados via URL assinada, com renovação automática.
 */
export function SignedImage({
  storagePath,
  fallbackUrl,
  bucket = OS_MEDIA_BUCKET,
  className,
  alt = "Registro fotográfico",
  onClick,
}: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(fallbackUrl ?? null);
  const [isLoading, setIsLoading] = useState(!!storagePath && !fallbackUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const resolve = async () => {
      if (!storagePath) {
        if (active) {
          setUrl(fallbackUrl ?? null);
          setIsLoading(false);
        }
        return;
      }
      
      if (active) setIsLoading(true);
      const signed = await getSignedUrl(bucket, storagePath, 3600);
      
      if (active) {
        setUrl(signed ?? fallbackUrl ?? null);
        setIsLoading(false);
        setHasError(!signed && !fallbackUrl);
      }
      
      // renova antes de expirar
      timer = setTimeout(resolve, 55 * 60 * 1000);
    };

    resolve();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [storagePath, fallbackUrl, bucket]);

  if (isLoading) {
    return <div className={`bg-slate-100 animate-pulse flex items-center justify-center ${className ?? ""}`} aria-hidden>
      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>;
  }

  if (hasError || !url) {
    return <div className={`bg-slate-100 flex items-center justify-center text-slate-400 ${className ?? ""}`} aria-hidden>
      <span className="text-[8px] font-black uppercase">Erro ao carregar</span>
    </div>;
  }

  return <img 
    src={url} 
    className={className} 
    alt={alt} 
    onClick={onClick} 
    loading="lazy" 
    onError={() => setHasError(true)}
  />;
}
