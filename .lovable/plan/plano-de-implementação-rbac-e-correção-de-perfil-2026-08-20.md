# Plano de Implementação: RBAC e Correção de Perfil

Este plano visa implementar a validação rigorosa de permissões (RBAC) em todas as listagens, detalhes e ações do sistema, garantindo que cada perfil veja apenas o que lhe é permitido via políticas do Supabase e lógica de front-end. Além disso, corrigiremos o erro na página de perfil que impede sua visualização.

## 1. Ajustes de Infraestrutura e Contexto
- Refinar o `src/routes/_authenticated/route.tsx` para garantir que o perfil e cargo do usuário sejam injetados corretamente no contexto de todas as rotas autenticadas.
- Centralizar a lógica de mapeamento de cargos (`app_role` vs `usuarios.cargo`).

## 2. Implementação de RBAC nas Listagens e Detalhes
- **Listagem de OS (`os/index.tsx`):**
  - Diretor/Gestor: Vê todas as OS.
  - Operador/Terceirizado: Vê apenas OS atribuídas a ele ou em status operacionais.
  - Aplicar filtros automáticos no `queryFn` baseados no `user_id`.
- **Detalhes da OS (`os/$id.tsx`):**
  - Restringir abas de "Orçamento" e "Financeiro" apenas para Diretor e Administrativo/Financeiro.
  - Impedir que Operadores alterem laudos técnicos ou orçamentos se não tiverem permissão.
- **Listagem de Clientes (`clientes/index.tsx`):**
  - Diretor/Financeiro/Gestor: Acesso total.
  - Operador: Acesso apenas visual a dados básicos (sem edição/exclusão).
- **Kanban (`kanban.tsx`):**
  - Filtrar cartões por responsabilidade técnica quando o perfil for Operador/Terceirizado.

## 3. Correção da Página de Perfil
- Corrigir o erro na rota `/profile` que está redirecionando ou falhando ao carregar.
- Verificar se o arquivo está no local correto (`src/routes/_authenticated/profile.tsx`).
- Garantir que o `useQuery` para o perfil não falhe caso o registro na tabela `usuarios` ainda não exista (criar se necessário).

## 4. Segurança no Banco de Dados (RLS)
- Revisar as políticas de RLS para as tabelas `ordens_servico`, `clientes` e `financeiro`.
- Garantir que `auth.uid()` seja usado para restringir o acesso no nível do banco.

## Detalhes Técnicos
- Uso de `Route.useRouteContext()` para acessar as flags de permissão (`isDiretor`, `isFinanceiro`, etc.).
- Renderização condicional de componentes UI (Botões de excluir, abas sensíveis).
- Injeção de cláusulas `.eq('tecnico_id', user.id)` ou similares em queries de usuários não-administrativos.
