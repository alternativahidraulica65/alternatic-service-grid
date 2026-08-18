# Plano de Ajustes: Remoção de Módulos e Refinamento de UI

Este plano detalha a remoção dos módulos de "Produtos" e "Pedidos", a implementação da criação de clientes via modal e a adição de botões de navegação "Voltar" em telas específicas.

## Alterações Propostas

### 1. Limpeza de Módulos (Produtos e Pedidos)
- **Remoção de Arquivos**: Excluir as rotas `src/routes/_authenticated/produtos/index.tsx` e `src/routes/_authenticated/pedidos/index.tsx`.
- **Navegação**: Remover os links de "Produtos" e "Pedidos" da barra lateral em `src/routes/_authenticated/dashboard.tsx`.
- **Dashboard**: Remover as referências a produtos e pedidos nas estatísticas e KPIs do dashboard do diretor (`src/routes/_authenticated/dashboard/diretor.tsx`).

### 2. Gestão de Clientes
- **Criação de Cliente**: Adicionar um formulário de criação de cliente em `src/routes/_authenticated/clientes/index.tsx`.
- **Interface**: Implementar um modal (Dialog) que é aberto pelo botão "Novo Cliente".
- **Dados**: Garantir que o formulário utilize os campos da tabela `public.clientes` (nome, cnpj, endereco, categoria, status, etc.) e que os cards de resumo reflitam os dados reais.

### 3. Navegação e UI
- **Botão Voltar**:
    - Adicionar botão "Voltar" na tela de **Busca Global** (Historico).
    - Adicionar botão "Voltar" na tela de **Kanban**.
- **Refinamento**: Ajustar o posicionamento dos botões para manter a consistência com a identidade visual "Industrial Gold".

## Detalhes Técnicos
- Utilização de `useMutation` do TanStack Query para criação de clientes.
- `Dialog` do shadcn/ui para o modal de novo cliente.
- `useRouter().history.back()` para funcionalidade de voltar.
- Limpeza de queries de produtos/pedidos em `dashboard/diretor.tsx`.

> Nota: As tabelas no banco de dados não serão excluídas fisicamente via migração neste passo para evitar perda acidental de dados, mas todas as referências na aplicação serão removidas conforme solicitado.
