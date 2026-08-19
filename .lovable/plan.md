# Plano de Implementação: RBAC e Detalhes do Cliente

Este plano detalha a implementação de permissões granulares por perfil (Diretor, Financeiro, Gestor, Operador) na gestão de clientes e a criação de uma página de detalhes do cliente integrada com o histórico de Ordens de Serviço (OS).

## 1. Implementação de RBAC no Frontend (Clientes)

Ajustar a interface de `src/routes/_authenticated/clientes/index.tsx` para respeitar as permissões definidas no contexto de autenticação.

### Regras de Acesso:
- **Diretor / Gestor**: Acesso total (Criar, Editar, Excluir).
- **Financeiro**: Acesso para Criar e Editar (sem Excluir).
- **Operador**: Acesso apenas para Leitura.

### Alterações Técnicas:
- Recuperar `isDiretor`, `isFinanceiro`, `isGestor`, `isOperador` do contexto da rota pai.
- Esconder o botão "Novo Cliente" para perfis sem permissão de escrita.
- Desabilitar ou esconder as opções "Editar" e "Remover" no menu de ações da tabela conforme o perfil.

## 2. Página de Detalhes do Cliente

Criar uma nova rota dinâmica para visualização detalhada de um cliente específico.

### Arquitetura:
- **Arquivo**: `src/routes/_authenticated/clientes/$id.tsx`
- **Funcionalidades**:
  - Exibição de dados cadastrais completos (Nome, CNPJ, Endereço, Contatos).
  - Cards de resumo (Total de OS, OS em aberto, Valor total faturado).
  - Lista de Ordens de Serviço relacionadas filtradas por `cliente_id`.
  - Botão de ação rápida para criar "Nova OS" já vinculada ao cliente.

## 3. Integração com Supabase

Garantir que as consultas e mutações utilizem as relações corretas entre as tabelas `clientes` e `ordens_servico`.

### Detalhes Técnicos:
- Query na tabela `clientes` filtrando por `id`.
- Query na tabela `ordens_servico` filtrando por `cliente_id`.
- Invalidação de queries no cache do React Query após edições ou exclusões para manter a consistência dos dados.

---

Este plano foca em segurança e experiência do usuário, garantindo que cada profissional acesse apenas o que é necessário para sua função.
