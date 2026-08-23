
-- Corrigir usuários existentes que podem estar com strings vazias em vez de NULL
UPDATE auth.users 
SET confirmation_token = NULL 
WHERE confirmation_token = '';

UPDATE auth.users 
SET recovery_token = NULL 
WHERE recovery_token = '';

UPDATE auth.users 
SET email_change_token_new = NULL 
WHERE email_change_token_new = '';

UPDATE auth.users 
SET email_change_token_current = NULL 
WHERE email_change_token_current = '';
