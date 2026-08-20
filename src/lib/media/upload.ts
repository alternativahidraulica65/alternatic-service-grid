import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";

export const OS_MEDIA_BUCKET = "os-midias";
export const ORCAMENTOS_BUCKET = "orcamentos-docs";

const MAX_DIMENSION = 1600;
const QUALITY = 0.8;
const TARGET_MB = 0.19; // ~195 KB

export interface CompressedResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  extension: "webp" | "jpeg";
}

function supportsWebp(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Compressão client-side obrigatória (Cláusula Pétrea #01).
 * WebP (fallback JPEG), máx. 1600px na maior borda, qualidade 0.8, alvo < 200 KB.
 */
export async function compressImage(file: File): Promise<CompressedResult> {
  const useWebp = supportsWebp();
  const mimeType = useWebp ? "image/webp" : "image/jpeg";
  const extension = useWebp ? "webp" : "jpeg";

  const compressed = await imageCompression(file, {
    maxSizeMB: TARGET_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    initialQuality: QUALITY,
    fileType: mimeType,
  });

  const baseName = file.name.replace(/\.[^.]+$/, "");
  const output = new File([compressed], `${baseName}.${extension}`, { type: mimeType });

  return {
    file: output,
    originalSize: file.size,
    compressedSize: output.size,
    extension,
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "geral";
}

export interface UploadOsPhotoParams {
  osId: string;
  categoria: string;
  file: File;
  legenda?: string;
  pecaId?: string | null;
  /** grava metadados em public.os_fotos_anexos (padrão: true) */
  registrarMetadados?: boolean;
  /** Callback para progresso do upload (0 a 100) */
  onProgress?: (progress: number) => void;
}

export interface UploadOsPhotoResult {
  storagePath: string;
  bucket: string;
  signedUrl: string | null;
  originalSize: number;
  compressedSize: number;
  registroId?: string | undefined;
}

/** Utilitário genérico de retry com backoff exponencial simples */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Caminho padrão: os_{os_id}/{categoria_slug}/{timestamp}_{filename}.webp
 */
export async function uploadOsPhoto({
  osId,
  categoria,
  file,
  legenda,
  pecaId = null,
  registrarMetadados = true,
  onProgress,
}: UploadOsPhotoParams): Promise<UploadOsPhotoResult> {
  const { file: compressed, originalSize, compressedSize, extension } = await compressImage(file);

  const safeName = slugify(file.name.replace(/\.[^.]+$/, "")).slice(0, 48);
  const storagePath = `os_${osId}/${slugify(categoria)}/${Date.now()}_${safeName}.${extension}`;

  const performUpload = async () => {
    const { error } = await supabase.storage
      .from(OS_MEDIA_BUCKET)
      .upload(storagePath, compressed, { 
        contentType: compressed.type, 
        upsert: false,
        // @ts-ignore - a tipagem do supabase-js pode variar dependendo da versão, mas a API suporta
        onUploadProgress: (progress: any) => {
          if (onProgress && progress.totalBytes > 0) {
            const percent = (progress.loadedBytes / progress.totalBytes) * 100;
            onProgress(Math.round(percent));
          }
        }
      });
    if (error) throw error;
  };

  await withRetry(performUpload);

  const signedUrl = await getSignedUrl(OS_MEDIA_BUCKET, storagePath);

  let registroId: string | undefined;
  if (registrarMetadados) {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("os_fotos_anexos")
      .insert({
        os_id: osId,
        peca_id: pecaId,
        foto_url: signedUrl ?? storagePath,
        storage_path: storagePath,
        bucket: OS_MEDIA_BUCKET,
        categoria,
        tipo: categoria,
        legenda: legenda ?? null,
        criado_por: userData.user?.id ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw error;
    registroId = (data as { id: string } | null)?.id;
  }

  return { storagePath, bucket: OS_MEDIA_BUCKET, signedUrl, originalSize, compressedSize, registroId };
}

/** URL assinada para buckets privados (1 hora). */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(valid, expiresIn);
  if (error || !data) return {};
  return data.reduce<Record<string, string>>((acc, item) => {
    if (item.path && item.signedUrl) acc[item.path] = item.signedUrl;
    return acc;
  }, {});
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
