# Plano de Implementação: Frontend Completo da Alternativa Hidráulica

O objetivo é implementar todas as telas e funcionalidades de frontend descritas no documento de requisitos (PRD), focando em uma interface industrial, responsiva e fiel ao design system (Industrial-gold #FFD700).

## 1. Estrutura de Rotas e Navegação
- [ ] Criar/Ajustar as rotas conforme o PRD:
  - `/dashboard/diretor`
  - `/dashboard/financeiro`
  - `/dashboard/gestor`
  - `/dashboard/operador`
  - `/clientes` (Listagem)
  - `/clientes/:id` (Detalhes com abas: Resumo, Dados, Contatos, Equipamentos, OS, Orçamentos, Financeiro, Histórico)
  - `/os/nova` (Formulário de abertura)
  - `/os/:id` (Gestão central da OS)
  - `/os/:id/checklist`
  - `/os/:id/laudo`
  - `/os/:id/pecas` (Rastreamento)
  - `/os/:id/orcamento`
  - `/os/:id/aprovacao`
  - `/os/:id/entrega`
  - `/configuracoes`
  - `/auditoria`
  - `/busca`
  - `/relatorios`

## 2. Implementação das Telas (Foco em UI/UX)
- [ ] **Dashboards Especializados**: Criar componentes específicos para cada persona (Diretor, Financeiro, Gestor, Operador), substituindo a lógica de switch atual por rotas dedicadas ou componentes mais robustos.
- [ ] **Módulo de Clientes**: Implementar a listagem com filtros e busca, e a página de detalhes com o sistema de abas.
- [ ] **Fluxo de OS**:
  - Implementar o formulário de "Nova OS" com autocomplete e campos dinâmicos.
  - Criar a tela de "Gestão da OS" (`/os/:id`) que serve como hub para todas as sub-etapas.
- [ ] **Etapas Operacionais**: Criar as interfaces para Checklist (com upload de fotos simulado ou real), Laudo Técnico, Rastreamento de Peças e Entrega.
- [ ] **Módulo Financeiro**: Interface de Orçamentação com cálculos automáticos e Aprovação.

## 3. Design System e Componentes
- [ ] Garantir o uso da paleta Industrial-gold (#FFD700) e cinza metálico.
- [ ] Utilizar ícones da Lucide adequados (Gotas de óleo, ferramentas, etc).
- [ ] Implementar componentes de feedback (Toasts, Loaders, Dialogs) consistentes.
- [ ] Criar um layout de navegação lateral (Sidebar) ou superior que facilite o acesso às diferentes áreas do sistema conforme o perfil.

## 4. Integração de Dados (Front-end Only)
- [ ] Utilizar TanStack Query para gerenciar o estado e cache dos dados.
- [ ] Manter as chamadas ao Supabase existentes, mas garantir que a UI se comporte bem mesmo com dados mockados ou parciais para agilizar a entrega do visual.

## Detalhes Técnicos
- **Framework**: TanStack Start (React 19).
- **Estilização**: Tailwind CSS v4.
- **Componentes**: Shadcn/UI adaptado para o tema industrial.
- **Estado**: TanStack Query e Router.
- **Icons**: Lucide React.
