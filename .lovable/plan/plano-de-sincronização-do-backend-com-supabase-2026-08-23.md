# Plano de Sincronização do Backend com Supabase

Conectar todos os módulos do sistema (Clientes, Ordens de Serviço, Kanban, Financeiro e RBAC) ao banco de dados Supabase da Alternativa Hidráulica, garantindo que não existam dados fictícios e que as permissões (RLS) estejam configuradas.

## Etapas

### 1. Configuração de Segurança e RBAC
- Garantir que as políticas de RLS (Row Level Security) permitam o acesso correto por perfil (Diretor, Financeiro, Gestor, Operador, Terceirizado).
- Ajustar o middleware de autenticação para garantir que o contexto do usuário esteja sempre disponível e correto.

### 2. Módulo de Clientes (CRUD Completo)
- Sincronizar listagem, criação, edição e exclusão com a tabela `public.clientes`.
- Integrar abas de detalhes (Resumo, Dados, Contatos, Equipamentos, OS, Orçamentos, Financeiro) com suas respectivas tabelas.

### 3. Módulo de Ordens de Serviço (OS) e Triagem
- Garantir que a criação de OS em `/os/nova` utilize os `tipos_equipamento` e salve corretamente em `public.ordens_servico`.
- Sincronizar o checklist dinâmico com `public.checklist_templates` e salvar o progresso em `public.os_checklist_tecnico`.
- Implementar a aba de Laudo Técnico salvando fotos no bucket `os-assets` e atualizando o status da OS.

### 4. Quadro de Produção (Kanban)
- Conectar o Kanban à tabela `public.ordens_servico`.
- Implementar a mudança de status por arrastar/soltar ou menu (conforme UI) persistindo no banco.

### 5. Módulo Financeiro e Fornecedores
- Sincronizar a gestão de fornecedores com `public.fornecedores`.
- Conectar o dashboard financeiro à tabela `public.lancamentos_financeiros`.
- Implementar alertas de limite de gasto mensal baseados em dados reais.

## Detalhes Técnicos
- **Database ID**: `omyaiprywidpxtbnntiq` (Confirmado via variáveis de ambiente).
- **Client**: `src/integrations/supabase/client.ts`.
- **RBAC**: Hook `src/hooks/useUserRole.ts` e middleware `src/routes/_authenticated/route.tsx`.
- **Query**: Utilização de `@tanstack/react-query` para gerenciamento de estado e cache.

---
*Este plano foca na integração total e remoção de dados mockados, seguindo rigorosamente o ID do banco fornecido.*
