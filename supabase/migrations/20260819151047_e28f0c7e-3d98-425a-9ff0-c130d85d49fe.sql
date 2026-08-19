
-- 1. Garante que auditoria_financeira.user_id aponte para auth.users(id)
-- Já está no schema, mas o Supabase não detectou a relação via API automática
-- Vamos criar um link explícito na tabela usuarios para facilitar join (se usuários existir)

ALTER TABLE public.auditoria_financeira DROP CONSTRAINT IF EXISTS auditoria_financeira_user_id_fkey;
ALTER TABLE public.auditoria_financeira ADD CONSTRAINT auditoria_financeira_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuarios(id);
