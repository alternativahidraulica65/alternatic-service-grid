import { createServerFn } from "@tanstack/react-start";

const OFFICIAL_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";
const PERFIS_ADMIN = ["diretor", "administrativo_financeiro", "financeiro"];

type AdminCtx = { adminKey: string };

async function adminFetch(
  path: string,
  init: RequestInit & { key: string },
): Promise<any> {
  const { key, ...rest } = init;
  let ultimoErro = "Erro na operação";

  // Até 3 tentativas: a API remota pode responder 502/504 esporadicamente.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${OFFICIAL_URL}${path}`, {
        ...rest,
        signal: controller.signal,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          ...(rest.headers || {}),
        },
      });
      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text ? { message: text } : null;
      }
      if (res.ok) return body;

      ultimoErro =
        body?.message || body?.error_description || body?.msg || text || `HTTP ${res.status}`;
      // Só vale a pena repetir em falhas temporárias do gateway.
      if (res.status < 500) break;
    } catch (e: any) {
      ultimoErro = e?.name === "AbortError" ? "Tempo esgotado ao contatar o servidor." : String(e?.message || e);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 600 * (tentativa + 1)));
  }

  throw new Error(ultimoErro);
}

/** Valida o token do chamador e garante que ele é diretor/financeiro. */
async function autorizar(accessToken: string): Promise<AdminCtx> {
  const key = process.env["EXTERNAL_SUPABASE_SECRET_KEY"];
  if (!key) throw new Error("Chave administrativa não configurada.");
  if (!accessToken) throw new Error("Sessão inválida. Faça login novamente.");

  const res = await fetch(`${OFFICIAL_URL}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Sessão inválida. Faça login novamente.");
  const user = (await res.json()) as { id: string };

  const roles = (await adminFetch(
    `/rest/v1/user_roles?select=role&user_id=eq.${user.id}`,
    { key, method: "GET" },
  )) as { role: string }[];
  const perfis = (await adminFetch(
    `/rest/v1/usuarios?select=cargo&user_id=eq.${user.id}`,
    { key, method: "GET" },
  )) as { cargo: string | null }[];

  const permitido =
    roles.some((r) => PERFIS_ADMIN.includes(r.role)) ||
    perfis.some((p) => p.cargo && PERFIS_ADMIN.includes(p.cargo));
  if (!permitido) throw new Error("Apenas Diretor ou Financeiro podem gerenciar usuários.");

  return { adminKey: key };
}

export const criarUsuario = createServerFn({ method: "POST" })
  .validator((d: {
    accessToken: string;
    email: string;
    senha: string;
    nome: string;
    cargo: string;
  }) => d)
  .handler(async ({ data }) => {
    const { adminKey } = await autorizar(data.accessToken);

    const criado = await adminFetch("/auth/v1/admin/users", {
      key: adminKey,
      method: "POST",
      body: JSON.stringify({
        email: data.email.trim().toLowerCase(),
        password: data.senha,
        email_confirm: true,
        user_metadata: { nome: data.nome },
      }),
    });

    const userId = criado.id as string;

    const existente = (await adminFetch(
      `/rest/v1/usuarios?select=id&user_id=eq.${userId}`,
      { key: adminKey, method: "GET" },
    )) as { id: string }[];

    if (existente.length === 0) {
      await adminFetch("/rest/v1/usuarios", {
        key: adminKey,
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          nome: data.nome,
          email: data.email.trim().toLowerCase(),
          cargo: data.cargo,
          ativo: true,
        }),
      });
    } else {
      await adminFetch(`/rest/v1/usuarios?user_id=eq.${userId}`, {
        key: adminKey,
        method: "PATCH",
        body: JSON.stringify({ nome: data.nome, cargo: data.cargo, ativo: true }),
      });
    }

    await adminFetch(`/rest/v1/user_roles?user_id=eq.${userId}`, {
      key: adminKey,
      method: "DELETE",
    });
    await adminFetch("/rest/v1/user_roles", {
      key: adminKey,
      method: "POST",
      body: JSON.stringify({ user_id: userId, role: data.cargo }),
    });

    return { ok: true, userId };
  });

export const resetarSenha = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string; novaSenha: string }) => d)
  .handler(async ({ data }) => {
    const { adminKey } = await autorizar(data.accessToken);
    await adminFetch(`/auth/v1/admin/users/${data.userId}`, {
      key: adminKey,
      method: "PUT",
      body: JSON.stringify({ password: data.novaSenha }),
    });
    return { ok: true };
  });

export const definirPermissao = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string; cargo: string }) => d)
  .handler(async ({ data }) => {
    const { adminKey } = await autorizar(data.accessToken);
    await adminFetch(`/rest/v1/usuarios?user_id=eq.${data.userId}`, {
      key: adminKey,
      method: "PATCH",
      body: JSON.stringify({ cargo: data.cargo }),
    });
    await adminFetch(`/rest/v1/user_roles?user_id=eq.${data.userId}`, {
      key: adminKey,
      method: "DELETE",
    });
    await adminFetch("/rest/v1/user_roles", {
      key: adminKey,
      method: "POST",
      body: JSON.stringify({ user_id: data.userId, role: data.cargo }),
    });
    return { ok: true };
  });

export const definirStatusUsuario = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string; ativo: boolean }) => d)
  .handler(async ({ data }) => {
    const { adminKey } = await autorizar(data.accessToken);
    await adminFetch(`/rest/v1/usuarios?user_id=eq.${data.userId}`, {
      key: adminKey,
      method: "PATCH",
      body: JSON.stringify({ ativo: data.ativo }),
    });
    // O bloqueio na conta de acesso é complementar: se a API de contas falhar,
    // o status em "usuarios" já foi gravado e a operação não deve quebrar.
    let avisoAcesso: string | null = null;
    try {
      await adminFetch(`/auth/v1/admin/users/${data.userId}`, {
        key: adminKey,
        method: "PUT",
        body: JSON.stringify({ ban_duration: data.ativo ? "none" : "876000h" }),
      });
    } catch (e: any) {
      avisoAcesso = String(e?.message || e);
    }
    return { ok: true, aviso: avisoAcesso };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { adminKey } = await autorizar(data.accessToken);

    await adminFetch(`/rest/v1/user_roles?user_id=eq.${data.userId}`, {
      key: adminKey,
      method: "DELETE",
    });
    await adminFetch(`/rest/v1/usuarios?user_id=eq.${data.userId}`, {
      key: adminKey,
      method: "DELETE",
    });
    await adminFetch(`/auth/v1/admin/users/${data.userId}`, {
      key: adminKey,
      method: "DELETE",
    });

    return { ok: true };
  });
