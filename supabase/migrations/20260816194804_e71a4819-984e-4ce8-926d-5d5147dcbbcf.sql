
-- Criar novos valores do enum separadamente
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrativo_financeiro';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'terceirizado';
