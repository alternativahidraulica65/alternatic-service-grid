# Refatoração para Integração Nativa Supabase

Este plano detalha a transição de dados locais/mockados para uma integração completa com o Supabase nas telas de OS, Kanban, Dashboards e Peças, conforme as diretrizes do arquivo `prompt.txt`.

## Alterações Propostas

### 1. Camada de Dados (Supabase)
- Identificar todas as telas que utilizam arrays locais ou `useState` com dados fixos.
- Substituir por consultas `supabase.from('...').select('*')`.
- Implementar `insert()`, `update()` e `delete()` nos formulários correspondentes.

### 2. UI e Experiência do Usuário (UX)
- Adicionar estados de `loading` (esqueletos ou spinners) durante o carregamento dos dados.
- Implementar tratamento de erros com `toast` para falhas de rede ou banco de dados.
- Garantir que o RLS (Row Level Security) seja respeitado em todas as chamadas.

### 3. Mapeamento de Telas
- **Listagem de OS**: `/ordens-servico/index` (se existir) ou aba de OS em clientes.
- **Kanban**: `src/routes/_authenticated/kanban.tsx`.
- **Dashboards**: `src/routes/_authenticated/dashboard.tsx` e sub-rotas (Diretor, Financeiro, Gestor).
- **Peças e Terceiros**: Seções dentro da OS ou telas administrativas.

## Detalhes Técnicos
- Utilizar `useQuery` do TanStack Query para gerenciamento de estado de servidor.
- Centralizar as chamadas de API em funções exportadas ou hooks personalizados para manter o código limpo (SOLID).
- Validar entradas com `zod` antes de enviar para o Supabase.
- Assegurar que as migrações SQL necessárias para as tabelas `peças` e `terceiros` (se ausentes) sejam criadas.
