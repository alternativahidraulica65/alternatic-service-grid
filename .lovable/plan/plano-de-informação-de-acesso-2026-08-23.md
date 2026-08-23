# Plano de Informação de Acesso

Este plano visa identificar e reportar as credenciais de acesso disponíveis no sistema para fins de teste e desenvolvimento, conforme solicitado. Nenhuma alteração de código ou banco de dados será realizada.

## Análise de Acesso
Com base na análise do banco de dados e do código-fonte, foram identificadas as seguintes contas de acesso configuradas para o ambiente de desenvolvimento:

### 1. Administrador de Desenvolvimento (Acesso Total)
- **E-mail:** `dev@admin.com`
- **Senha:** `admin65`
- **Perfil:** Diretor / Admin (Possui acesso total a todas as áreas do sistema).

### 2. Administrador Temporário
- **E-mail:** `admin.temp@alternativa.com`
- **Senha:** `admin123`
- **Perfil:** Diretor.

## Procedimento
- Validar a existência dos usuários no banco de dados (Concluído).
- Informar ao usuário as credenciais encontradas.

## Detalhes Técnicos
- As credenciais foram extraídas de comentários no arquivo `src/routes/index.tsx` e do histórico de migrações do banco de dados.
- O sistema utiliza **Supabase Auth** para a autenticação.
- O mapeamento de perfis (RBAC) é realizado através das tabelas `public.usuarios` e `public.user_roles`.
