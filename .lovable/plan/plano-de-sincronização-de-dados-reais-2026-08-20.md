# Plano de Sincronização de Dados Reais

Este plano descreve as ações para conectar todas as telas do ERP Alternativa Hidráulica ao banco de dados Supabase, removendo todos os dados fictícios (mocks) remanescentes.

## Mudanças Necessárias

### Auditoria (`src/routes/_authenticated/admin/auditoria.tsx`)
- Implementar a busca real de logs de auditoria. Como não existe uma tabela `auditoria` global, utilizaremos a tabela `os_auditoria_categorias` e criaremos uma view ou RPC para consolidar logs de diferentes tabelas (`clientes`, `ordens_servico`, `usuarios`).
- Substituir o array `logsMock` por uma consulta `useQuery` ao Supabase.
- Dinamizar o contador total de registros e a paginação.

### Histórico de OS (`src/routes/_authenticated/historico.tsx`)
- Dinamizar os cards de KPI (Total em Aberto, Finalizadas, Aguardando Aprovação, Faturamento Previsto) usando agregações reais da tabela `ordens_servico`.
- Corrigir a paginação "Exibindo 5 de 1.240" para refletir o total real.

### Relatórios (`src/routes/_authenticated/relatorios.tsx`)
- Substituir os arrays estáticos (`dataFaturamento`, `dataProdutividade`, `statusOS`) por consultas dinâmicas.
- Agrupar OS por mês para o gráfico de faturamento.
- Agrupar OS por técnico para o gráfico de produtividade.
- Dinamizar os "Alertas de Gargalo" baseando-se em OS com SLA excedido.

### Dashboard Financeiro (`src/routes/_authenticated/dashboard/financeiro.tsx`)
- Dinamizar o card de "Inadimplência" (atualmente zerado de forma estática).
- Dinamizar as "Metas do Mês" com base no faturamento real vs. uma meta configurável ou fixa no banco.

### Dashboard Gestor (`src/routes/_authenticated/dashboard/gestor.tsx`)
- Dinamizar os cards de "Equip. Parados", "Operadores", "Terceiros" e "Peças Fora".
- Integrar a seção de "Alertas Operacionais" com dados reais de OS críticas.

### Dashboard Operador (`src/routes/_authenticated/dashboard/operador.tsx`)
- Dinamizar o card "MTTR Médio" e "Produtividade" (que estão no Diretor mas afetam a visão do Operador também).

## Detalhes Técnicos
- Utilização de `useQuery` do TanStack Query para todas as buscas.
- Implementação de filtros RBAC nas consultas para garantir que cada perfil veja apenas o que lhe é permitido.
- Manutenção da interface "Industrial Gold" durante a transição dos dados.

## User Review Required
- A tabela de auditoria global ainda não existe. Pretendo criar uma tabela `public.logs_sistema` via migração para centralizar esses eventos, ou prefere que eu utilize as tabelas de auditoria específicas de cada módulo?
