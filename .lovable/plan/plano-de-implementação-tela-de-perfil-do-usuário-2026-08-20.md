# Plano de Implementação: Tela de Perfil do Usuário

Implementação da tela de Perfil do Usuário (`/profile`) permitindo a gestão de dados pessoais, preferências visuais e segurança, seguindo o design industrial do projeto Alternativa Hidráulica.

## Ações Realizadas
- Criação da rota `src/routes/_authenticated/profile.tsx`.
- Desenvolvimento da interface baseada no mockup fornecido (User Profile).
- Integração com Supabase Auth para gestão de e-mail e senha.
- Integração com a tabela `public.usuarios` para dados de perfil (Nome, Cargo).
- Implementação de upload de foto de perfil para o bucket `user-profiles`.

## Detalhes Técnicos
- **Rota:** `/_authenticated/profile` (TanStack Router).
- **Componentes UI:** Shadcn/UI (Card, Input, Label, RadioGroup, Button, Avatar).
- **Validação:** Zod + React Hook Form.
- **Segurança:**
  - Alteração de senha via `supabase.auth.updateUser`.
  - Alteração de e-mail com confirmação obrigatória.
  - RLS garantindo que usuários editem apenas seus próprios perfis.
- **Identidade Visual:** Industrial-gold (#FFD700) e Cinza Slate (#0F172A), tipografia Montserrat e Inter.
