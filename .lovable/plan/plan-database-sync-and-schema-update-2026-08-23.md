# Plan - Database Sync and Schema Update

The user identified a discrepancy between the expected types of equipment (11 items with categories) and the current database state (5 items, missing the `categoria_principal` column). I will update the schema and synchronize the data with the provided SQL source.

## Proposed Changes

### Database Migration
- Add the missing `categoria_principal` column to the `public.tipos_equipamento` table.
- Insert the 11 equipment types from the provided SQL file (`tipos_equipamento_rows_2.sql`).
- Ensure RLS policies remain functional for the new schema.

### Data Synchronization
- Run the SQL provided by the user to populate the table with the correct, detailed list of hydraulic components.
- Verify that the frontend (OS creation and triage screens) correctly fetches and displays all 11 items.

## Technical Details
- SQL Migration:
  ```sql
  ALTER TABLE public.tipos_equipamento ADD COLUMN IF NOT EXISTS categoria_principal TEXT;
  
  -- Clear existing rows to avoid duplicates or conflicts with specific IDs
  DELETE FROM public.tipos_equipamento;
  
  -- Insert data from user-uploads://tipos_equipamento_rows_2.sql
  INSERT INTO "public"."tipos_equipamento" ("id", "nome", "categoria_principal", "descricao", "criado_em") VALUES 
  ('1378ea26-ab27-4078-b921-217bbc36b4bd', 'Comando Hidráulico', 'Comandos', 'Comandos monobloco ou modulares', '2026-08-19 15:30:47.614423+00'),
  ... (remaining items from SQL file)
  ```

- Verification: Run a query to confirm 11 rows exist with the correct columns.
