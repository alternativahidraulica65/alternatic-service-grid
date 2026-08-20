# Plano de Implementação: Navegação por Clique em Cards e Listas (UX Drill-down)

Este plano detalha a implementação de interatividade "drill-down" em todo o ERP. O objetivo é permitir que o usuário navegue para detalhes ou listagens filtradas ao clicar em cards de KPI, nomes de clientes e itens de dashboard.

## Alterações Visuais e Funcionais

### 1. Dashboards (Diretor, Financeiro, Gestor, Operador)
- **Cards de KPI:** Transformar os `KPICard` em elementos clicáveis que redirecionam para as listagens correspondentes (ex: Clicar em "OS Abertas" leva para `/os` filtrado ou apenas `/os`).
- **Cards Específicos:** Clicar em "OS Atrasadas" no dashboard do Gestor redirecionará para a listagem de OS com o filtro de atraso (quando disponível).
- **Lista de Fornecedores (Financeiro):** Clicar em um fornecedor no dashboard financeiro redirecionará para a gestão de fornecedores.

### 2. Listagens (Clientes, OS)
- **Lista de OS (`/os`):** Clicar na linha da tabela ou no nome do cliente na tabela redirecionará para `/os/$id`.
- **Lista de Clientes (`/clientes`):** Clicar na linha da tabela ou no nome do cliente redirecionará para `/clientes/$id`.
- **Tabela de Recebimentos (Financeiro):** Clicar no nome do cliente redirecionará para a tela do cliente.

### 3. Melhorias de Feedback Visual (UX)
- Adicionar `cursor-pointer` em todos os elementos clicáveis.
- Adicionar efeitos de `hover` mais pronunciados (leve elevação ou mudança de fundo) para indicar interatividade.
- Garantir que a navegação via teclado continue funcionando.

## Detalhes Técnicos
- Uso de `useRouter` do TanStack Router para navegação programática.
- Passagem de estados de busca/filtro via `search` params quando possível.
- Envolvimento de componentes estáticos em wrappers clicáveis ou adição de `onClick`.

## Arquivos a serem modificados:
- `src/routes/_authenticated/dashboard/diretor.tsx`
- `src/routes/_authenticated/dashboard/financeiro.tsx`
- `src/routes/_authenticated/dashboard/gestor.tsx`
- `src/routes/_authenticated/dashboard/operador.tsx`
- `src/routes/_authenticated/os/index.tsx`
- `src/routes/_authenticated/clientes/index.tsx`
