# Plano de Implementação - Módulo Financeiro Avançado (Alternativa Hidráulica)

Este plano descreve a implementação das funcionalidades solicitadas para o módulo financeiro, focando em importação em lote, auditoria e visualização de tendências.

## 1. Importação em Lote de Fornecedores (CSV)
Adicionar funcionalidade para carregar múltiplos fornecedores de uma vez.

- **Frontend**: 
  - Botão "Importar CSV" na tela de Gestão de Fornecedores.
  - Modal de upload com zona de arraste (drag-and-drop).
  - Validação client-side de formato de arquivo e estrutura do CSV.
- **Lógica**:
  - Validação de CNPJ (formato e dígitos verificadores).
  - Tratamento de erros detalhado (ex: linha 5 com CNPJ inválido).
  - Uso de `supabase.from('fornecedores').upsert()` para processamento em lote.

## 2. Histórico e Auditoria
Registrar todas as alterações críticas para rastreabilidade.

- **Banco de Dados**:
  - Criar tabela `public.auditoria_financeira` (id, user_id, action, table_name, record_id, old_values, new_values, created_at).
- **Lógica**:
  - Implementar triggers no Postgres ou capturar mudanças via Server Functions/Client mutations para registrar:
    - Quem alterou (através do `auth.uid()`).
    - O que foi alterado (valores antigos vs novos).
    - Data/hora exata.
- **Frontend**: 
  - Aba ou Modal de "Histórico de Alterações" nas telas de Fornecedores e Lançamentos.

## 3. Gráfico de Tendência Mensal
Visualização da evolução de gastos por fornecedor.

- **Componente**:
  - Novo card no Dashboard Financeiro usando `Recharts` (LineChart ou AreaChart).
  - Toggle para selecionar período (últimos 6 ou 12 meses).
- **Lógica de Dados**:
  - Query agregada por mês/ano na tabela `lancamentos_financeiros`.
  - Filtro por fornecedor específico ou visão consolidada.

## Detalhes Técnicos

- **Bibliotecas**: `papaparse` para parsing de CSV no navegador.
- **Segurança**: RLS garantindo que apenas Diretor e Financeiro acessem a auditoria.
- **UX**: Toasts de progresso durante a importação em lote.
