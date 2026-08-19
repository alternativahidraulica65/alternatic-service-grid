
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- 1. Limpeza preventiva
  DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin.temp@alternativa.com');
  -- O trigger handle_new_user usa ON CONFLICT DO NOTHING, mas vamos limpar o perfil público se ele existir sem role
  DELETE FROM public.usuarios WHERE email = 'admin.temp@alternativa.com';
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin.temp@alternativa.com');
  DELETE FROM auth.users WHERE email = 'admin.temp@alternativa.com';

  -- 2. Inserir no auth.users (isso disparará o trigger handle_new_user)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'admin.temp@alternativa.com',
    crypt('admin123', gen_salt('bf')),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nome": "Admin Temporário"}',
    now(),
    now(),
    '', '', '', ''
  );

  -- 3. Inserir identidades
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    format('{"sub":"%s", "email":"%s"}', new_user_id, 'admin.temp@alternativa.com')::jsonb,
    'email',
    new_user_id,
    now(),
    now(),
    now()
  );

  -- 4. O trigger já criou o registro em public.usuarios. 
  -- Agora atribuímos a role de diretor.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'diretor');

END $$;
