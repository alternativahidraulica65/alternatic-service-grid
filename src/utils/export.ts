import { supabase } from "@/integrations/supabase/client";

/**
 * Utilitário para exportar dados para CSV e disparar o download no navegador.
 * @param data Array de objetos com os dados a serem exportados.
 * @param filename Nome do arquivo (ex: 'clientes.csv').
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.error("Nenhum dado para exportar");
    return;
  }

  // Extrair cabeçalhos
  const headers = Object.keys(data[0]);
  
  // Criar linhas
  const rows = data.map(obj => 
    headers.map(header => {
      let val = obj[header];
      if (val === null || val === undefined) val = "";
      // Escapar aspas e tratar vírgulas
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
