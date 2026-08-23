# Plan - Rename Equipment Types Table to Singular

The user reported that the database table should be `public.tipos_equipamento` (singular) instead of `public.tipos_equipamentos` (plural). The following steps will rename the table and update the application code to match.

## Proposed Changes

### Database

- Rename table `public.tipos_equipamentos` to `public.tipos_equipamento`.
- Ensure all existing records and constraints are preserved.
- Grant necessary permissions on the renamed table.

### Frontend Application

- Update all occurrences of `tipos_equipamentos` to `tipos_equipamento` in:
    - `src/routes/_authenticated/nova-os.tsx`
    - `src/routes/_authenticated/admin/checklist-templates.tsx`
    - `src/routes/_authenticated/os/$id.tsx`

## Technical Details

### SQL Migration
```sql
ALTER TABLE public.tipos_equipamentos RENAME TO tipos_equipamento;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_equipamento TO authenticated;
GRANT ALL ON public.tipos_equipamento TO service_role;
```

### Code Updates
- Change `supabase.from('tipos_equipamentos')` to `supabase.from('tipos_equipamento')`.
- Update query keys in TanStack Query (e.g., `['tipos_equipamentos']` to `['tipos_equipamento']`).
- Update related selectors and mappings where the plural form was used as a key.
