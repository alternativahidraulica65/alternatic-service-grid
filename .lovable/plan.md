# Plano de Implementação: Formulários, Dashboard Dinâmico e Exportação CSV

Este plano detalha a implementação das funcionalidades solicitadas para os módulos de Clientes, Produtos e Pedidos, além da dinamização total do Dashboard e adição de recursos de navegação e exportação.

## Alterações de Banco de Dados (Supabase)

- **Tabela `produtos`**: Criar tabela para gestão de itens de venda/estoque.
- **Tabela `pedidos`**: Criar tabela para cabeçalho de pedidos (cliente, valor total, status, data).
- **Tabela `itens_pedido`**: Criar tabela para itens vinculados a pedidos.
- **Grants e RLS**: Aplicar políticas de segurança para cada nova tabela.

## Funcionalidades de Frontend

### 1. Formulários de Entidades (CRUD)
- **Cliente**: Refatorar botão "Novo Cliente" para abrir modal ou rota de formulário funcional.
- **Produto**: Criar tela de listagem e formulário de criação em `/produtos` (nova rota).
- **Pedido**: Criar fluxo de criação de pedidos com seleção dinâmica de cliente e múltiplos produtos em `/pedidos` (nova rota).

### 2. Dashboard Dinâmico
- Implementar queries em tempo real no `DashboardDiretor` e `DashboardLayout` para:
    - **Total de Clientes**: `count()` na tabela `clientes`.
    - **Total de Produtos**: `count()` na tabela `produtos`.
    - **Vendas do Mês**: `sum(valor_total)` na tabela `pedidos` filtrando por `created_at`.
    - **Pedidos Pendentes**: `count()` na tabela `pedidos` com `status = 'pendente'`.

### 3. Navegação e UX
- Adicionar botão **"Voltar"** em:
    - Tela de Detalhes de Cliente.
    - Tela de Nova OS/Pedido.
    - Usará `router.history.back()` ou link explícito para a lista.

### 4. Exportação de Dados (CSV)
- Implementar utilitário `exportToCSV` para gerar arquivos a partir de arrays de dados.
- Adicionar botão "Exportar" funcional nas tabelas de:
    - Clientes (`src/routes/_authenticated/clientes/index.tsx`)
    - Produtos (Nova tela)
    - Pedidos (Nova tela)

## Detalhes Técnicos
- Uso de `useQuery` e `useMutation` do TanStack Query para interações com Supabase.
- Validação de formulários com `zod` e `react-hook-form`.
- Toasts de feedback (sucesso/erro) em todas as operações de escrita.
