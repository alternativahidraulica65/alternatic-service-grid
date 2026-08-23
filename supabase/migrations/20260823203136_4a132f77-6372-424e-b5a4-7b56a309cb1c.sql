
-- Garantir que não existam NULLs nas colunas que o GoTrue está tentando ler como string
UPDATE auth.users 
SET confirmation_token = COALESCE(confirmation_token, '')
WHERE confirmation_token IS NULL;

UPDATE auth.users 
SET recovery_token = COALESCE(recovery_token, '')
WHERE recovery_token IS NULL;

UPDATE auth.users 
SET email_change_token_new = COALESCE(email_change_token_new, '')
WHERE email_change_token_new IS NULL;

UPDATE auth.users 
SET email_change_token_current = COALESCE(email_change_token_current, '')
WHERE email_change_token_current IS NULL;

UPDATE auth.users 
SET phone_change_token = COALESCE(phone_change_token, '')
WHERE phone_change_token IS NULL;

UPDATE auth.users 
SET reauthentication_token = COALESCE(reauthentication_token, '')
WHERE reauthentication_token IS NULL;
