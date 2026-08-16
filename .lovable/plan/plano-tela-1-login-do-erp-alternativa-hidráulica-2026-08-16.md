# Plano: Tela 1 — Login do ERP Alternativa Hidráulica

## Objetivo
Entregar a tela de login centralizada, responsiva e com identidade visual industrial do sistema ERP de gestão de OS da Alternativa Hidráulica, conectada ao backend de autenticação do Lovable Cloud.

## Escopo
1. **Design system industrial** em `src/styles.css`:
   - Paleta: amarelo/dourado industrial como primária, cinza metálico, branco e cinza claro, preto/cinza chumbo para textos.
   - Tipografia: Montserrat para títulos, Inter para textos/dados.
   - Botões com bordas levemente arredondadas, cards estruturados com sombras sutis.

2. **Backend de usuários e RBAC** via migration do Lovable Cloud:
   - Enum `app_role` com os papéis: `diretor`, `financeiro`, `gestor`, `operador`.
   - Tabela `public.usuarios` vinculada ao `auth.users` (perfil, nome, e-mail, avatar, status ativo).
   - Tabela `public.user_roles` separada para papéis (evita escalation).
   - Trigger para criar o perfil automaticamente no primeiro signup.
   - RLS e GRANTs adequados.

3. **Tela de login** (`src/routes/auth.tsx` ou equivalente, padrão Lovable Cloud):
   - Formulário com e-mail e senha.
   - Botão de entrada estilizado na cor primária amarelo/dourado.
   - Estados de carregamento, erro e feedback via toast.
   - Rodapé discreto com a marca "Alternativa Hidráulica".
   - Redirecionamento para área logada após autenticação.

4. **Ajustes de infraestrutura**:
   - Adicionar `<Toaster />` no `__root.tsx` para feedback.
   - Garantir que `src/start.ts` mantenha o middleware de bearer token.

5. **Validação**:
   - Build bem-sucedido (`vite build`).
   - Verificar renderização visual da tela de login.

## Fora do escopo desta etapa
- Dashboards internos, Kanban, OS, custos, faturamento, aprovações e outros módulos do ERP (serão telas subsequentes).
