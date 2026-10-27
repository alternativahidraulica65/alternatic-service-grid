import { gerarDanfsePdf } from "./danfse";

/** Lê o XML autorizado da NFS-e, gera o DANFSe, salva ao lado do XML e grava pdf_path. */
export async function gerarPdfDeNfse(admin: any, nota: any): Promise<string> {
  const { data: blob, error } = await admin.storage.from("documentos-fiscais").download(nota.xml_path);
  if (error || !blob) throw new Error("XML autorizado indisponível.");
  const dest = nota.dados_snapshot?.destinatario || {};
  const mun: Record<string, string> = {};
  if (dest.codigo_ibge && dest.cidade) mun[String(dest.codigo_ibge)] = `${dest.cidade} - ${dest.uf || ""}`;
  const bytes = await gerarDanfsePdf(await blob.text(), mun);
  const path = nota.xml_path.replace(/\.xml$/i, ".pdf");
  const up = await admin.storage.from("documentos-fiscais").upload(path, new Blob([bytes], { type: "application/pdf" }), { upsert: true });
  if (up.error) throw new Error("Não foi possível salvar o PDF.");
  await admin.from("notas_fiscais").update({ pdf_path: path, updated_at: new Date().toISOString() }).eq("id", nota.id);
  return path;
}
