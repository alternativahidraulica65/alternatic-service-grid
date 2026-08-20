# Layout autenticado padronizado + "Manter conectado"

## Problema atual

O menu lateral (com pin, hover-expand e overlay mobile) existe apenas dentro de `dashboard.tsx`. Rotas como `/clientes`, `/os`, `/relatorios`, `/financeiro/*`, `/admin/*`, `/kanban` e `/profile` ficam fora desse layout e aparecem sem menu, quebrando a consistência.

No login, a sessão já é persistida por padrão, mas não existe escolha do usuário entre "manter conectado" e "encerrar ao fechar o navegador".

## O que será feito

### 1. Shell único para todas as rotas autenticadas

- Extrair a sidebar + cabeçalho de `dashboard.tsx` para um componente compartilhado `src/components/layout/AppShell.tsx` (mesmo visual, mesmos itens de menu, mesmo comportamento de pin/hover/overlay).
- Renderizar o `AppShell` em `src/routes/_authenticated/route.tsx` envolvendo o `<Outlet />`, para que toda rota `_authenticated` herde o layout automaticamente.
- `dashboard.tsx` passa a conter apenas o seletor de visão (RBAC View Switcher) e seu `<Outlet />`, sem duplicar a sidebar.
- Filtragem de menu por perfil continua vindo do contexto do `route.tsx` (sem mudança de regras de acesso).
- Estado do menu: `isPinned` persistido em `localStorage` (chave já usada, `sidebar_pinned`) e agora válido em todas as telas; no mobile, drawer/overlay via Sheet, sem pin.

### 2. Manter sessão iniciada

- Adicionar checkbox "Manter-me conectado" na tela de login (marcado por padrão).
- Marcado: sessão persiste entre visitas (comportamento atual do armazenamento local).
- Desmarcado: grava um sinalizador de sessão temporária; ao abrir o app numa nova sessão do navegador sem esse sinalizador, a sessão é encerrada e o usuário volta ao login.
- A escolha é lida no bootstrap do app (rota raiz), antes de qualquer redirecionamento.

## Detalhes técnicos

- Novo arquivo: `src/components/layout/AppShell.tsx` (props: contexto de usuário/perfil/roles).
- `src/routes/_authenticated/route.tsx`: `component` passa a ser `() => <AppShell><Outlet /></AppShell>`; `beforeLoad` inalterado.
- `src/routes/_authenticated/dashboard.tsx`: remove sidebar/header/sign-out duplicados, mantém `ViewSwitcher` e navegação por perfil.
- Login (`src/routes/index.tsx`): checkbox controla flag `keep_signed_in` em `localStorage` + marca `sessionStorage`; verificação de expiração em `__root.tsx` ou no carregamento da rota de login chama `supabase.auth.signOut()` quando aplicável.
- Nenhuma alteração de banco, RLS ou regras RBAC.
