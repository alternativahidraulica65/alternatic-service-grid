// Somente servidor: chame apenas dentro de handlers de server functions.
const OFFICIAL_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";
let cache: string | null = null;

/** Retorna uma chave administrativa válida; se a configurada for recusada, busca a atual pela API de gestão. */
export async function obterChaveAdmin(): Promise<string> {
  if (cache) return cache;
  const configurada = process.env["EXTERNAL_SUPABASE_SECRET_KEY"];
  if (configurada) {
    const t = await fetch(`${OFFICIAL_URL}/auth/v1/admin/users?per_page=1`, {
      headers: { apikey: configurada, Authorization: `Bearer ${configurada}` },
    });
    if (t.ok) return (cache = configurada);
  }
  const mgmt = process.env["EXTERNAL_SUPABASE_MANAGEMENT_TOKEN"];
  if (!mgmt) throw new Error("Chave administrativa inválida ou não configurada.");
  const r = await fetch("https://api.supabase.com/v1/projects/mpwnrcxyyeqftrejwmmx/api-keys?reveal=true", {
    headers: { Authorization: `Bearer ${mgmt}` },
  });
  if (!r.ok) throw new Error("Não foi possível obter a chave administrativa.");
  const keys = (await r.json()) as { name: string; type: string; api_key: string }[];
  const k = keys.find((x) => x.type === "secret")?.api_key || keys.find((x) => x.name === "service_role")?.api_key;
  if (!k) throw new Error("Chave administrativa não encontrada.");
  return (cache = k);
}
