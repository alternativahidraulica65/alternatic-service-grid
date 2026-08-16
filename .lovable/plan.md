# Plano: Implementação do Dashboard Industrial Dinâmico (Tela 2)

Implementação da lógica de perfis e visualizações específicas para o ERP Alternativa Hidráulica, integrando dados reais do backend.

## 1. Infraestrutura de Dados e Segurança
- **Middleware de Autenticação:** Atualizar `_authenticated/route.tsx` para carregar o perfil do usuário e as roles via Supabase durante o `beforeLoad`.
- **RBAC:** Definir flag `isAdmin` para usuários 'admin@teste.com' ou com role 'diretor'.
- **Mock Data (Opcional):** Preparar estruturas para KPIs caso as tabelas de faturamento/OS ainda não possuam dados.

## 2. Componentes de UI Industrial
- **Header:** Exibir perfil do usuário e contexto da empresa.
- **KPI Cards:** Componentes reutilizáveis para exibir métricas com ícones industriais e variações de tendência.
- **Revenue Charts:** Gráfico de faturamento por CNPJ emissor (usando Recharts ou similar).

## 3. Visões por Perfil
- **Diretor / Financeiro:** Dashboard completo com KPIs financeiros, gráfico de faturamento por CNPJ e atalhos de aprovação.
- **Gestor:** Foco em produção, lista de equipamentos em manutenção e indicadores de gargalo.
- **Operador:** Visualização simplificada focada na fila de tarefas (OS) atribuídas a ele.

## Detalhes Técnicos
- **Framework:** TanStack Start v1.
- **Estilo:** Tailwind CSS v4 com sistema de design industrial (Amarelo #FFD700 / Cinza Slate).
- **Backend:** Consultas diretas via Supabase client no `beforeLoad` e loaders das rotas.
- **Acessibilidade:** Garantir `aria-labels` em todos os cards de métricas e botões de ação.
