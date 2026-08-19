# Plano de Refatoração: Tela de Detalhes do Cliente

Refatorar a página de detalhes do cliente (`/clientes/:id`) para uma interface baseada em abas, oferecendo uma visão 360º do cliente, incluindo dados cadastrais, contatos, equipamentos, ordens de serviço, orçamentos e financeiro.

## Alterações Propostas

### 1. Estrutura de Navegação (Abas)
Implementar o componente `Tabs` com as seguintes seções:
- **Resumo**: KPIs rápidos (Volume OS, Pendentes, Faturamento) e timeline de atividades recentes.
- **Dados Cadastrais**: Formulário de visualização/edição de dados da empresa (CNPJ, Endereço, etc.).
- **Contatos**: Lista de pessoas de contato vinculadas ao cliente (Nova tabela `cliente_contatos`).
- **Equipamentos**: Inventário de máquinas do cliente (Nova tabela `cliente_equipamentos`).
- **OS**: Listagem detalhada de ordens de serviço com filtros.
- **Orçamentos**: Histórico de propostas comerciais enviadas.
- **Financeiro**: Resumo de lançamentos, faturas e limite de crédito.
- **Histórico**: Timeline completa de todas as interações (Auditoria).

### 2. Backend (Banco de Dados)
- Utilização das tabelas `cliente_contatos` e `cliente_equipamentos` criadas.
- Integração com `ordens_servico` e `lancamentos_financeiros` (já existentes).

### 3. Interface e UX
- Manter o design system industrial (Montserrat/Inter, cores amarela/slate).
- Adicionar botões de ação rápida: "Editar Cliente" e "Nova OS".
- Implementar skeletons de carregamento para cada aba.

## Detalhes Técnicos
- Arquivo: `src/routes/_authenticated/clientes/$id.tsx`
- Componentes: `Tabs`, `Card`, `Table`, `Badge`, `Button` (shadcn/ui).
- Ícones: `lucide-react`.
- Estado: TanStack Query para cada aba para otimizar o carregamento.
