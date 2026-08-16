# Plan - Fase 01: Ajuste da Tela de Login

Este plano descreve as alterações para permitir que o usuário realize o login utilizando seu Nome/Usuário em vez do e-mail, mantendo a autenticação segura via Supabase Auth.

## Alterações

### Banco de Dados (Supabase)
- Garantir que a tabela `public.usuarios` seja acessível para consulta pública limitada (apenas para encontrar o e-mail associado a um nome de usuário) ou via RPC segura.
- **Estratégia**: Criaremos uma função no banco de dados (`security definer`) que recebe um nome de usuário e retorna o e-mail correspondente. Isso evita expor a tabela `usuarios` inteira ou todos os e-mails via RLS público.

### Frontend (React/TanStack)
- **Schema de Validação**: Atualizar o `loginSchema` em `src/routes/index.tsx` para aceitar um campo `username` (texto) em vez de `email`.
- **Interface**: 
    - Alterar o rótulo de "E-mail" para "Usuário".
    - Atualizar placeholders para "Digite seu usuário" e "Digite sua senha".
    - Manter o ícone de `User` (substituindo o `Mail`).
- **Lógica de Login**:
    - No `onSubmit`, antes de chamar `supabase.auth.signInWithPassword`, faremos uma chamada à nova função do banco para obter o e-mail vinculado ao nome inserido.
    - Se o usuário não for encontrado, retornaremos uma mensagem de erro genérica ("Usuário ou senha incorretos") para segurança.
    - Se encontrado, prosseguiremos com o login usando o e-mail retornado e a senha digitada.

## Detalhes Técnicos

1. **SQL Migration**:
```sql
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT email FROM public.usuarios WHERE nome = p_username OR email = p_username LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated;
```

2. **Componente de Login (`src/routes/index.tsx`)**:
- Trocar `email` por `username` no Zod e no `useForm`.
- Implementar a busca do e-mail via `supabase.rpc('get_email_by_username', { p_username: values.username })`.
- O usuário DEV (`teste.dev@alternativahidraulica.local`) continuará funcionando pois a função buscará tanto por nome quanto por e-mail.

## Verificação
- Tentar logar com o nome de usuário (ex: "teste.dev@alternativahidraulica.local").
- Validar se mensagens de erro permanecem seguras.
- Confirmar que o usuário DEV mantém acesso e permissões.
