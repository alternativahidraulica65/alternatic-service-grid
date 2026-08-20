# Plan: Gestão de Vendedores & Comissões

Implement detailed management screen for Salespeople and Commissions, including CRUD operations, business rules, and Supabase integration.

## Technical Details

- **Route**: `src/routes/_authenticated/admin/vendedores.tsx`
- **Database Schema**:
  - Table `public.vendedores`: `id`, `nome`, `regra_comissao` (enum/text), `tipo_calculo` (enum/text), `percentual` (numeric), `observacao` (text).
  - Table `public.vendedor_empresas`: Junction table between `vendedores` and `empresas_emissoras`.
- **UI Components**:
  - `Card` based KPIs (Total, Percentual Bruto, Lucro Líquido).
  - `Table` with filtering and search.
  - `Dialog` (Modal) for Create/Edit forms using `react-hook-form` and `zod`.
  - `MultiSelect` or similar for linking multiple companies.
- **Roles**: Access restricted to `diretor` and `gestor` profiles.

## Steps

1. **Database Migration**:
   - Create `public.vendedores` and `public.vendedor_empresas`.
   - Setup RLS and Grants.
2. **Route Implementation**:
   - Create `src/routes/_authenticated/admin/vendedores.tsx`.
   - Implement data fetching with TanStack Query.
   - Build the responsive layout with KPI cards and Filter bar.
   - Implement the main data table with row actions.
3. **Form & Logic**:
   - Implement the registration modal with validation.
   - Add success/error toasts.
4. **Navigation**:
   - Add the new route to the sidebar in `src/routes/_authenticated/dashboard.tsx`.
