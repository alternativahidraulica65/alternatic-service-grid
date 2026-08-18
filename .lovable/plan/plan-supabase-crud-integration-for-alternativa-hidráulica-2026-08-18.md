# Plan: Supabase CRUD Integration for Alternativa Hidráulica

Integrate the existing frontend modules with the Supabase backend to enable full CRUD operations for Customers, Service Orders (OS), Engineering Materials, and User Management.

## 1. Database Schema Alignment & Seeding
- Ensure all frontend modules use actual table names and columns from the Supabase schema (`public.clientes`, `public.ordens_servico`, `public.pecas_os`, `public.materiais`, `public.usuarios`, etc.).
- Add any missing columns or tables needed (e.g., `os_checklist_tecnico`, `os_fotos_anexos`, `os_guarda_pecas`) if not already present in the schema (though instructions say not to create new ones unless necessary, I will check and report if critical).

## 2. CRUD Implementation by Module

### A. Customers (`src/routes/_authenticated/clientes/index.tsx`)
- **Read**: Replace mock data with `useSuspenseQuery` to fetch from `public.clientes`.
- **Create**: Add a "New Customer" Dialog/Form and connect it to `supabase.from('clientes').insert()`.
- **Update**: Implement an "Edit Customer" action in the dropdown menu.
- **Delete**: Implement a "Delete" action with confirmation.

### B. Service Orders (OS)
- **Hub (`src/routes/_authenticated/os/$id.tsx`)**: Fetch dynamic data using the `id` param.
- **Create (`src/routes/_authenticated/os/nova.tsx`)**: Connect the "Abertura de OS" form to `public.ordens_servico`.
- **Kanban (`src/routes/_authenticated/kanban.tsx`)**: Replace mock cards with live data and implement drag-and-drop or status updates via the UI.
- **Triagem & Parts**: Connect parts tracking to `public.os_guarda_pecas`.

### C. Engineering & Materials (`src/routes/_authenticated/engenharia/materiais.tsx`)
- **Read**: Fetch materials and densities from `public.materiais`.
- **Create/Update**: Allow saving calculated specifications.

### D. Budget & Pricing (`src/routes/_authenticated/orcamento.tsx`)
- **CRUD**: Connect items to `public.custos_os` and updates to `public.ordens_servico` (totals and margins).

### E. User Management (`src/routes/_authenticated/admin/usuarios.tsx`)
- **Read/Update**: Connect to `public.usuarios` and `public.user_roles`.

## 3. Real-time & Consistency
- Use `queryClient.invalidateQueries` after every mutation to ensure the UI reflects changes immediately.
- Implement `supabase.channel` for real-time updates on the Kanban board and Dashboard if needed.
- Ensure all operations respect RLS policies.

## 4. Engineering Details (Technical)
- Use `@tanstack/react-query` for data fetching and caching.
- Use `supabase-js` for all direct database interactions.
- Currency and date formatting will be handled client-side using standard JS locales.
