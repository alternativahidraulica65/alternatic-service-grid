import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const ItemSchema = z.object({
  id: z.string(),
  descricao: z.string().max(500),
  categoria: z.string().max(80).nullable().optional(),
  valor: z.number().nullable().optional(),
  fornecedor: z.string().max(200).nullable().optional(),
  criado_em: z.string().nullable().optional(),
  pago: z.boolean().nullable().optional(),
});

const InputSchema = z.object({
  accessToken: z.string().min(1),
  contexto: z.object({
    numero_os: z.string().max(60).nullable().optional(),
    equipamento: z.string().max(300).nullable().optional(),
    defeitos: z.string().max(3000).nullable().optional(),
    servicos: z.string().max(3000).nullable().optional(),
  }),
  itens: z.array(ItemSchema).min(1).max(200),
});

export type ResultadoDuplicidade = {
  resumo: string;
  grupos: { ids: string[]; confianca: "alta" | "media" | "baixa"; motivo: string; sugestao: string }[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "grupos"],
  properties: {
    resumo: { type: "string" },
    grupos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ids", "confianca", "motivo", "sugestao"],
        properties: {
          ids: { type: "array", items: { type: "string" } },
          confianca: { type: "string", enum: ["alta", "media", "baixa"] },
          motivo: { type: "string" },
          sugestao: { type: "string" },
        },
      },
    },
  },
};

export const analisarDuplicidadeCustos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ResultadoDuplicidade> => {
    const key = process.env["EXTERNAL_SUPABASE_SECRET_KEY"];
    const aiKey = process.env["LOVABLE_API_KEY"];
    if (!key || !aiKey) throw new Error("Serviço indisponível. Tente novamente mais tarde.");
    const client = createClient("https://mpwnrcxyyeqftrejwmmx.supabase.co", key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await client.auth.getUser(data.accessToken);
    if (authError || !auth.user) throw new Error("Sessão inválida. Entre novamente.");
    const { data: roles } = await client.from("user_roles").select("role").eq("user_id", auth.user.id);
    if (!roles?.some((r) => ["gestor", "diretor", "administrativo_financeiro", "financeiro"].includes(r.role))) {
      throw new Error("Somente Gestor, Diretor ou Financeiro podem usar a análise.");
    }

    const instructions =
      "Você é um auditor de custos de uma oficina de manutenção hidráulica (cilindros, hastes, êmbolos, tubos, vedações). " +
      "Recebe os custos lançados em uma OS e o contexto do serviço. Identifique possíveis lançamentos duplicados: mesma peça/serviço lançado duas vezes, " +
      "descrições equivalentes (ex: 'Haste - usinagem' e 'usinagem da haste'), mesmo valor e fornecedor em datas próximas, ou custo automático repetido de destino de peça. " +
      "Não marque como duplicado itens que são legitimamente diferentes (ex: haste e tubo; vedação e usinagem). Use apenas IDs fornecidos. " +
      "Responda em português do Brasil, com motivos curtos e objetivos. Se não houver suspeita, retorne grupos vazio.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions,
        input: JSON.stringify({ contexto: data.contexto, itens: data.itens }),
        reasoning: { effort: "low" },
        store: false,
        stream: true,
        text: { format: { type: "json_schema", name: "duplicidade", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Muitas análises em sequência. Aguarde um instante e tente de novo.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Configurações → Planos.");
      if (res.status === 403) throw new Error("Acesso à IA bloqueado para este workspace.");
      console.error("AI gateway", res.status, body.slice(0, 500));
      throw new Error("Não foi possível analisar agora.");
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let texto = "";
    let refusal = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.type === "response.output_text.delta") texto += ev.delta ?? "";
            else if (ev.type === "response.refusal.delta") refusal = true;
            else if (ev.type === "error" || ev.type === "response.failed") throw new Error("Falha na análise.");
          } catch (e) {
            if (e instanceof Error && e.message === "Falha na análise.") throw e;
          }
        }
      }
    }
    if (refusal || !texto) throw new Error("A IA não retornou uma análise para estes custos.");
    const out = JSON.parse(texto) as ResultadoDuplicidade;
    const validos = new Set(data.itens.map((i) => i.id));
    out.grupos = out.grupos
      .map((g) => ({ ...g, ids: g.ids.filter((id) => validos.has(id)) }))
      .filter((g) => g.ids.length >= 2);
    return out;
  });
