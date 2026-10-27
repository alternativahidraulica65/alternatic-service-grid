import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// DANFSE (documento auxiliar da NFS-e Nacional) gerado a partir do XML autorizado. Roda no servidor (Workers).
const tag = (xml: string, t: string) => {
  const m = xml.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`));
  return m ? (m[1] ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim() : "";
};
// Fontes padrão só cobrem WinAnsi: troca o que não couber.
const limpa = (s: string) => s.replace(/[·•]/g, "-").replace(/[^\x20-\x7E\u00A0-\u00FF—–“”‘’]/g, "");
const docFmt = (d: string) =>
  d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  : d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : d;
const cepFmt = (c: string) => c.replace(/(\d{5})(\d{3})/, "$1-$2");
const brl = (v: string) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataFmt = (iso: string) => {
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ""}` : iso;
};

function quebra(texto: string, font: PDFFont, size: number, largura: number) {
  const linhas: string[] = [];
  for (const par of limpa(texto).split(/\n/)) {
    let atual = "";
    for (const p of par.split(/\s+/)) {
      const t = atual ? `${atual} ${p}` : p;
      if (font.widthOfTextAtSize(t, size) > largura && atual) { linhas.push(atual); atual = p; } else atual = t;
    }
    linhas.push(atual);
  }
  return linhas;
}

export async function gerarDanfsePdf(xml: string, municipios: Record<string, string> = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page: PDFPage = pdf.addPage([595.28, 841.89]);
  const M = 32, W = 595.28 - M * 2;
  let y = 841.89 - M;
  const cinza = rgb(0.35, 0.35, 0.35), linha = rgb(0.75, 0.75, 0.75);

  const inf = tag(xml, "infNFSe"), dps = tag(xml, "infDPS"), emit = tag(inf, "emit"), toma = tag(dps, "toma");
  const chave = (xml.match(/Id="NFS(\d{50})"/) || [])[1] || "";
  const producao = tag(dps, "tpAmb") === "1";

  const txt = (s: string, x: number, yy: number, size = 8, f: PDFFont = reg, color = rgb(0, 0, 0)) =>
    page.drawText(limpa(s), { x, y: yy, size, font: f, color });
  const secao = (titulo: string) => {
    y -= 6;
    page.drawRectangle({ x: M, y: y - 12, width: W, height: 13, color: rgb(0.12, 0.12, 0.12) });
    txt(titulo.toUpperCase(), M + 5, y - 9, 7.5, bold, rgb(1, 0.84, 0));
    y -= 16;
  };
  const campos = (itens: [string, string][], cols = 3) => {
    const cw = W / cols;
    for (let i = 0; i < itens.length; i += cols) {
      let alt = 0;
      itens.slice(i, i + cols).forEach(([rot, val], j) => {
        txt(rot, M + j * cw + 4, y - 7, 6, bold, cinza);
        const ls = quebra(val || "-", reg, 8, cw - 8);
        ls.forEach((l, k) => txt(l, M + j * cw + 4, y - 17 - k * 9.5, 8));
        alt = Math.max(alt, 12 + ls.length * 9.5);
      });
      y -= alt + 3;
      page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.4, color: linha });
    }
  };
  const bloco = (texto: string, size = 8) => {
    for (const l of quebra(texto || "-", reg, size, W - 8)) { txt(l, M + 4, y - size - 1, size); y -= size + 2.5; }
    y -= 4;
  };

  // Cabeçalho
  page.drawRectangle({ x: M, y: y - 46, width: W, height: 46, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  txt("DANFSe v1.0", M + 8, y - 16, 13, bold);
  txt("Documento Auxiliar da NFS-e", M + 8, y - 30, 8, reg, cinza);
  txt(`NFS-e Nº ${tag(inf, "nNFSe")}`, M + W - 170, y - 16, 13, bold);
  txt(`Emissão: ${dataFmt(tag(dps, "dhEmi"))}  ·  DPS ${tag(dps, "nDPS")} série ${tag(dps, "serie")}`, M + W - 170, y - 30, 7, reg, cinza);
  txt(`Autorizada em ${dataFmt(tag(inf, "dhProc"))}`, M + W - 170, y - 40, 7, reg, cinza);
  y -= 52;
  if (!producao) {
    txt("EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL", M, y - 10, 10, bold, rgb(0.8, 0, 0));
    y -= 16;
  }
  txt("Chave de acesso da NFS-e", M, y - 7, 6, bold, cinza);
  txt(chave.replace(/(\d{5})(?=\d)/g, "$1 "), M, y - 19, 9.5, bold);
  txt("Consulte a autenticidade em www.nfse.gov.br/consultapublica", M + W - 230, y - 19, 7, reg, cinza);
  y -= 26;

  const mun = (c: string) => (municipios[c] ? `${municipios[c]} (${c})` : c);
  const end = tag(emit, "enderNac");
  secao("Prestador do serviço");
  campos([
    ["CNPJ / CPF", docFmt(tag(emit, "CNPJ") || tag(emit, "CPF"))],
    ["Inscrição municipal", tag(emit, "IM")],
    ["Município", `${tag(inf, "xLocEmi")} - ${tag(end, "UF")}`],
    ["Nome / Razão social", tag(emit, "xNome").replace(/\s+/g, " ")],
    ["Endereço", `${tag(end, "xLgr")}, ${tag(end, "nro")} - ${tag(end, "xBairro")}`],
    ["CEP", cepFmt(tag(end, "CEP"))],
    ["Simples Nacional", tag(dps, "opSimpNac") === "3" ? "Optante - ME/EPP" : tag(dps, "opSimpNac") === "2" ? "Optante - MEI" : "Não optante"],
  ]);

  const tend = tag(toma, "end");
  secao("Tomador do serviço");
  campos([
    ["CNPJ / CPF", docFmt(tag(toma, "CNPJ") || tag(toma, "CPF"))],
    ["Nome / Razão social", tag(toma, "xNome")],
    ["Município", mun(tag(tag(tend, "endNac"), "cMun"))],
    ["Endereço", [tag(tend, "xLgr"), tag(tend, "nro"), tag(tend, "xCpl"), tag(tend, "xBairro")].filter(Boolean).join(", ")],
    ["CEP", cepFmt(tag(tag(tend, "endNac"), "CEP"))],
    ["E-mail", tag(toma, "email")],
  ]);

  const cServ = tag(dps, "cServ");
  const trib = tag(cServ, "cTribNac").replace(/(\d{2})(\d{2})(\d{2})/, "$1.$2.$3");
  secao("Serviço prestado");
  campos([
    ["Código de tributação nacional", `${trib} - ${tag(inf, "xTribNac")}`],
    ["Local da prestação", `${tag(inf, "xLocPrestacao")}`],
    ["Código NBS", `${tag(cServ, "cNBS")}${tag(inf, "xNBS") ? ` - ${tag(inf, "xNBS")}` : ""}`],
  ], 1);
  txt("Descrição do serviço", M + 4, y - 7, 6, bold, cinza);
  y -= 10;
  bloco(tag(cServ, "xDescServ"), 8.5);

  const val = tag(dps, "valores"), tm = tag(val, "tribMun");
  const retido = tag(tm, "tpRetISSQN") === "2";
  secao("Tributação e valores");
  campos([
    ["Valor do serviço", brl(tag(val, "vServ"))],
    ["Município de incidência do ISSQN", tag(inf, "xLocIncid")],
    ["Retenção do ISSQN", retido ? "Retido pelo tomador" : "Não retido"],
    ["Alíquota ISSQN", tag(tm, "pAliq") ? `${tag(tm, "pAliq")}%` : "Apurado no Simples Nacional"],
    ["Total aprox. tributos (Simples)", tag(val, "pTotTribSN") ? `${tag(val, "pTotTribSN")}%` : "-"],
    ["Valor líquido", brl(tag(tag(inf, "valores"), "vLiq") || tag(val, "vServ"))],
  ]);

  y -= 6;
  page.drawRectangle({ x: M, y: y - 26, width: W, height: 26, color: rgb(1, 0.84, 0) });
  txt("VALOR LÍQUIDO DA NFS-e", M + 8, y - 17, 10, bold);
  const vl = brl(tag(tag(inf, "valores"), "vLiq") || tag(val, "vServ"));
  txt(vl, M + W - 8 - bold.widthOfTextAtSize(vl, 14), y - 18, 14, bold);
  y -= 34;

  if (tag(dps, "xInfComp")) { secao("Informações complementares"); bloco(tag(dps, "xInfComp")); }

  txt("Documento gerado pelo ERP Alternativa Hidráulica a partir do XML autorizado pelo Sistema Nacional NFS-e.", M, M - 10, 6.5, reg, cinza);
  return pdf.save();
}
