# Plano de Refatoração: Autenticação Direta por E-mail e Senha

O objetivo é simplificar o fluxo de login, removendo a dependência de nomes de usuário (username) e a função RPC `get_email_by_username`, migrando para o padrão nativo do Supabase de E-mail e Senha. Além disso, o usuário desenvolvedor será atualizado para garantir acesso total via middleware.

## Alterações Técnicas

### 1. Tela de Login (`src/routes/index.tsx`)
- Alterar o esquema Zod para utilizar `email` em vez de `username`.
- Atualizar a interface do formulário:
    - Rótulo: "E-mail".
    - Ícone: Manter `Mail` (já presente nos imports, mas o campo usava `User`).
    - Placeholder: "Digite seu e-mail".
- Refatorar a função `onSubmit`:
    - Remover a chamada RPC `supabase.rpc('get_email_by_username', ...)`.
    - Chamar diretamente `supabase.auth.signInWithPassword({ email, password })`.
- Limpar imports e estados não utilizados (como referências a username).

### 2. Middleware de Autenticação (`src/routes/_authenticated/route.tsx`)
- Atualizar a verificação do usuário desenvolvedor (DEV):
    - Novo e-mail: `dev@admin.com`.
    - Garantir que `hasFullAccess` seja `true` e todas as flags de cargo (`isDiretor`, `isFinanceiro`, etc.) sejam ativadas para este e-mail.
- Refinar a busca do perfil na tabela `public.usuarios`:
    - Garantir que a query utilize o `id` da sessão de forma robusta.

### 3. Limpeza de Legado
- Remover referências a `username` e lógica de tradução de ID no banco de dados (via instruções futuras se necessário, mas focado no código agora).

## Segurança
- O acesso total para `dev@admin.com` será injetado diretamente no contexto da rota, permitindo testes rápidos sem depender de registros manuais em todas as tabelas de permissão durante a fase de desenvolvimento.
