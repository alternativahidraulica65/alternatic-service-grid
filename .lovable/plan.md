# Plano de Implementação: Navegação e Página de Detalhes

Este plano detalha a reestruturação da navegação do ERP e a implementação da página de detalhes do item, seguindo as diretrizes de design industrial da Alternativa Hidráulica.

## 1. Experiência do Usuário (UX)

- **Fluxo Principal**: Navegação fluida entre listagens (Clientes, Ordens de Serviço) e suas respectivas páginas de detalhes.
- **Hierarquia Visual**: Uso de abas (Tabs) para organizar informações complexas em páginas de detalhes, mantendo o contexto industrial.
- **Navegação de Retorno**: Botão "Voltar" padronizado no cabeçalho das páginas de detalhes para retorno à listagem de origem.

## 2. Estrutura Técnica

### 2.1 Páginas de Listagem (Home/List Pages)
- **Clientes**: `src/routes/_authenticated/clientes/index.tsx`
- **Ordens de Serviço**: `src/routes/_authenticated/os/index.tsx` (Será criada/refatorada)
- **Componentes**: Utilização de `Card` e `Table` com links de navegação para as rotas de detalhes passando o ID.

### 2.2 Páginas de Detalhes (Item Detail Pages)
- **Cliente**: `src/routes/_authenticated/clientes/$id.tsx`
- **Ordem de Serviço**: `src/routes/_authenticated/os/$id.tsx`
- **Abas Padronizadas**:
  - `Visão Geral`: KPIs e dados principais.
  - `Comentários/Timeline`: Histórico de interações.
  - `Anexos`: Fotos e documentos (Cláusula Pétrea #01).
  - `Histórico`: Logs de auditoria (Auditoria Industrial).

### 2.3 Navegação e Rotas
- Configuração de rotas dinâmicas com TanStack Router: `/:item_type/:item_id`.
- Implementação de `Loading States` com skeletons industriais durante o fetch de dados.

## 3. Tarefas de Implementação

- [ ] Criar a rota de listagem de Ordens de Serviço (`/os`) se não existir ou se for apenas o Kanban.
- [ ] Refatorar a página de detalhes do cliente (`/clientes/$id`) para incluir o cabeçalho com botão voltar e organização por abas.
- [ ] Refatorar a página de gestão de OS (`/os/$id`) para garantir a consistência do botão voltar e das abas de navegação.
- [ ] Garantir que todos os cards de listagem usem `<Link>` para navegação direta.
- [ ] Implementar estados de carregamento (Skeletons) consistentes em todas as rotas de detalhes.
