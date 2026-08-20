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

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const resolve = async () => {
      if (!storagePath) {
        if (active) setUrl(fallbackUrl ?? null);
        return;
      }
      const signed = await getSignedUrl(bucket, storagePath, 3600);
      if (active) setUrl(signed ?? fallbackUrl ?? null);
      // renova antes de expirar
      timer = setTimeout(resolve, 55 * 60 * 1000);
    };

    resolve();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [storagePath, fallbackUrl, bucket]);

  if (!url) {
    return <div className={`bg-slate-100 animate-pulse ${className ?? ""}`} aria-hidden />;
  }

  return <img src={url} className={className} alt={alt} onClick={onClick} loading="lazy" />;
}
