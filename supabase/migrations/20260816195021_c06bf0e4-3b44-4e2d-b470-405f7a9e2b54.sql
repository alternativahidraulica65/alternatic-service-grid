
-- Atribuir role 'diretor' ao usuário DEV com o ID correto
INSERT INTO public.user_roles (user_id, role)
VALUES ('301cd75a-fc72-445a-9d89-9182a2f7e6aa', 'diretor'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Corrigir ID na tabela usuarios se necessário
UPDATE public.usuarios 
SET user_id = '301cd75a-fc72-445a-9d89-9182a2f7e6aa'
WHERE email = 'teste.dev@alternativahidraulica.local';
