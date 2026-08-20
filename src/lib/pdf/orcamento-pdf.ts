import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { ORCAMENTOS_BUCKET, OS_MEDIA_BUCKET, getSignedUrl } from "@/lib/media/upload";

export interface ItemPdf {
  descricao: string;
  qtd: number;
  valorUnit: number;
  total: number;
}

export interface FotoPdf {
  id: string;
  storage_path?: string | null;
  foto_url?: string | null;
  legenda?: string | null;
}

export interface GerarOrcamentoParams {
  osId: string;
  numeroOs: string;
  cliente: string;
  itens: ItemPdf[];
  fotos: FotoPdf[];
  totais: {
    custoBase: number;
    imposto: number;
    valorImposto: number;
    margem: number;
    comissao: number;
    valorComissao: number;
    valorFinal: number;
  };
}

const GOLD: [number, number, number] = [255, 215, 0];
const SLATE: [number, number, number] = [15, 23, 42];

const money = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildOrcamentoPdf(params: GerarOrcamentoParams): Promise<Blob> {
  const { numeroOs, cliente, itens, fotos, totais } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho industrial
  doc.setFillColor(...SLATE);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 88, pageWidth, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ALTERNATIVA HIDRAULICA", 40, 42);
  doc.setFontSize(9);
  doc.setTextColor(255, 215, 0);
  doc.text("PROPOSTA COMERCIAL / ORCAMENTO TECNICO", 40, 62);

  doc.setTextColor(...SLATE);
  doc.setFontSize(10);
  doc.text(`OS: ${numeroOs}`, 40, 125);
  doc.text(`Cliente: ${cliente}`, 40, 142);
  doc.text(`Emissao: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 180, 125);

  autoTable(doc, {
    startY: 165,
    head: [["Descricao", "Qtd", "Valor Unit.", "Total"]],
    body: itens.map((i) => [i.descricao || "-", String(i.qtd), money(i.valorUnit), money(i.total)]),
    theme: "grid",
    headStyles: { fillColor: SLATE, textColor: [255, 215, 0], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    columnStyles: { 1: { halign: "center", cellWidth: 50 }, 2: { halign: "right", cellWidth: 90 }, 3: { halign: "right", cellWidth: 90 } },
    margin: { left: 40, right: 40 },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

  const linhas: Array<[string, string]> = [
    ["Custo base", money(totais.custoBase)],
    [`Impostos (${totais.imposto}%)`, money(totais.valorImposto)],
    [`Comissao (${totais.comissao}%)`, money(totais.valorComissao)],
  ];
  doc.setFontSize(9);
  linhas.forEach(([label, valor]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, pageWidth - 250, y);
    doc.setTextColor(...SLATE);
    doc.text(valor, pageWidth - 40, y, { align: "right" });
    y += 16;
  });

  doc.setFillColor(...SLATE);
  doc.rect(pageWidth - 260, y - 2, 220, 32, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 215, 0);
  doc.text("VALOR TOTAL", pageWidth - 248, y + 18);
  doc.setTextColor(255, 255, 255);
  doc.text(money(totais.valorFinal), pageWidth - 52, y + 18, { align: "right" });

  // Laudo visual
  if (fotos.length > 0) {
    doc.addPage();
    doc.setFillColor(...SLATE);
    doc.rect(0, 0, pageWidth, 56, "F");
    doc.setTextColor(255, 215, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("LAUDO VISUAL - REGISTRO FOTOGRAFICO", 40, 34);

    let x = 40;
    let py = 90;
    const w = (pageWidth - 100) / 2;
    const h = w * 0.72;

    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i]!;
      const src = foto.storage_path
        ? await getSignedUrl(OS_MEDIA_BUCKET, foto.storage_path)
        : foto.foto_url ?? null;
      const dataUrl = src ? await toDataUrl(src) : null;

      if (py + h > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        py = 60;
        x = 40;
      }

      doc.setDrawColor(226, 232, 240);
      doc.rect(x, py, w, h);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, "JPEG", x + 2, py + 2, w - 4, h - 4, undefined, "FAST");
        } catch {
          /* imagem incompatível: mantém moldura */
        }
      }
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(foto.legenda || `Registro ${i + 1}`, x, py + h + 12, { maxWidth: w });

      if (x === 40) {
        x = 60 + w;
      } else {
        x = 40;
        py += h + 32;
      }
    }
  }

  return doc.output("blob");
}

export interface SalvarRevisaoResult {
  numeroRevisao: number;
  storagePath: string;
}

export async function gerarESalvarRevisao(
  params: GerarOrcamentoParams & { fotosSelecionadasIds: string[] },
): Promise<SalvarRevisaoResult> {
  const blob = await buildOrcamentoPdf(params);

  const { data: ultima } = await supabase
    .from("orcamento_revisoes")
    .select("numero_revisao")
    .eq("orcamento_id", params.osId)
    .order("numero_revisao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const numeroRevisao = ((ultima as { numero_revisao: number } | null)?.numero_revisao ?? -1) + 1;
  const numeroLimpo = params.numeroOs.replace(/[^A-Za-z0-9-]/g, "");
  const storagePath = `os_${params.osId}/orcamentos/ORC_${numeroLimpo}_REV${numeroRevisao}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(ORCAMENTOS_BUCKET)
    .upload(storagePath, blob, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("orcamento_revisoes").insert({
    orcamento_id: params.osId,
    numero_revisao: numeroRevisao,
    numero_orcamento: numeroLimpo,
    pdf_storage_path: storagePath,
    fotos_selecionadas: params.fotosSelecionadasIds,
    valor_total: params.totais.valorFinal,
    parametros: params.totais,
    criado_por: userData.user?.id ?? null,
  } as never);
  if (error) throw error;

  return { numeroRevisao, storagePath };
}
