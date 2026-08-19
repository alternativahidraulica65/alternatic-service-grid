DO $$ 
BEGIN 
    UPDATE auth.users 
    SET email = 'dev@admin.com',
        raw_user_meta_data = jsonb_set(raw_user_meta_data, '{email}', '"dev@admin.com"')
    WHERE id = '301cd75a-fc72-445a-9d89-9182a2f7e6aa';

    UPDATE public.usuarios 
    SET email = 'dev@admin.com',
        nome = 'Administrador Dev'
    WHERE user_id = '301cd75a-fc72-445a-9d89-9182a2f7e6aa';
END $$;