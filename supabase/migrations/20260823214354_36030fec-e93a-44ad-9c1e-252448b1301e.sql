-- 1. Create a migration to seed checklist templates
-- This ensures that the user sees data in the OS checklist and Nova OS

INSERT INTO public.checklist_templates (tipo_equipamento_id, nome, itens)
SELECT id, 'Padrão ' || nome, '[{"label": "Limpeza Geral", "obrigatorio": true}, {"label": "Vazamentos", "obrigatorio": true}, {"label": "Pressão", "obrigatorio": true}, {"label": "Ruído Anormal", "obrigatorio": true}]'::jsonb
FROM public.tipos_equipamento;

-- Ensure RLS allows access
GRANT SELECT ON public.tipos_equipamento TO authenticated;
GRANT SELECT ON public.checklist_templates TO authenticated;
