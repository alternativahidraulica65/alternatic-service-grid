ALTER TABLE public.historico_status_os ADD COLUMN IF NOT EXISTS executor_email text;

UPDATE public.historico_status_os h
SET executor_email = u.email
FROM public.usuarios u
WHERE h.executor_email IS NULL
  AND h.executor_id IS NOT NULL
  AND (u.id::text = h.executor_id::text OR u.user_id::text = h.executor_id::text);