# Plano de Implementação - Gestão de Fornecedores e Refinamentos Financeiros

Este plano detalha a implementação do cadastro de fornecedores, filtros de período, exportação de dados e sistema de alertas de gastos para o ERP Alternativa Hidráulica.

## Alterações

### Banco de Dados
- **Tabela `public.fornecedores`**: Adicionar colunas `cnpj` (text), `contato` (text), `observacoes` (text) e `ativo` (boolean).
- **Tabela `public.lancamentos_financeiros`**: Adicionar coluna `fornecedor_id` (uuid) vinculada a `public.fornecedores` se ainda não existir.
- **Configurações**: Criar tabela `public.configuracoes_financeiras` para armazenar o `limite_mensal_fornecedor`.

### Frontend - Gestão de Fornecedores
- **Nova Rota `src/routes/_authenticated/financeiro/fornecedores/index.tsx`**: Tela de listagem de fornecedores com busca e status.
- **Componente de Cadastro**: Modal para criar/editar fornecedores com validação de CNPJ e dados de contato.
- **Integração no Menu**: Adicionar link para "Fornecedores" no sidebar (em `src/routes/_authenticated/route.tsx` ou componente de navegação).

### Dashboard Financeiro - Refinamentos
- **Filtros de Período**: Implementar seletores de Mês/Ano no card de "Controle de Fornecedores".
- **Exportação**: Adicionar botões para gerar CSV (usando `src/utils/export.ts`) e PDF do resumo mensal.
- **Alertas de Limite**: 
    - Implementar lógica para comparar gastos do mês com o limite configurado.
    - Destaque visual (bordas vermelhas/ícones de alerta) nos cards de fornecedores que excederem o limite.

## Detalhes Técnicos

### Estrutura de Tabelas (SQL)
```sql
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS contato TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS limite_mensal DECIMAL(12,2) DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
```

### Exportação PDF
- Utilizaremos uma abordagem baseada em `window.print()` com estilos CSS específicos para impressão ou uma biblioteca leve se necessário, mas para este ERP industrial, um layout de impressão limpo costuma ser preferido.

### Alertas
- A lógica de alerta será processada no frontend durante o agrupamento dos dados do `useQuery`, comparando o `item.total` com o `item.limite_mensal` retornado do banco.
