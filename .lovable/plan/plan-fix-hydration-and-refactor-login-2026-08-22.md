# Plan: Fix Hydration and Refactor Login

Corrigir o erro de Hydration Mismatch no Root Shell e destravar a validação do formulário de login no sistema "Alternativa Hidráulica".

## Technical Details

### 1. Root Shell Refinement
- Update `src/routes/__root.tsx` to include `suppressHydrationWarning` on `<html>` and `<body>` tags.
- Ensure authentication checks are consistent with TanStack Start's architecture.

### 2. Login Form Refactoring
- Refactor `src/routes/index.tsx` (Login page).
- Sanitize email input (trim and lowercase) before submission.
- Simplify Zod validation to allow broader email formats.
- Improve error handling with the Industrial Premium design system (Toasts/Alerts).

### 3. Session Mapping and Redirect
- Update login logic to fetch the user profile (`perfil`, `nome`) from the `usuarios` table after successful authentication.
- Redirect to `/dashboard` upon successful login.

## Proposed Changes

### Root Shell (`src/routes/__root.tsx`)
- Add `suppressHydrationWarning`.

### Login Page (`src/routes/index.tsx`)
- Update `loginSchema` for simpler email validation.
- Implement `sanitizedEmail` logic.
- Fetch user profile data after `signInWithPassword`.
- Update toast notifications to match the requested visual style if necessary.
