
-- Tentar atribuir via UUID para maior precisão
DO $$ 
DECLARE
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'teste.dev@alternativahidraulica.local' LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'diretor'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
