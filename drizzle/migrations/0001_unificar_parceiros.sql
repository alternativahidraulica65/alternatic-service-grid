ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS tipo_parceiro text NOT NULL DEFAULT 'material',
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_tipo_parceiro_chk CHECK (tipo_parceiro IN ('material','servico','ambos'));
INSERT INTO public.fornecedores (id, nome, cnpj, contato, telefone, email, endereco, observacoes, ativo, tipo_parceiro, status_cadastro)
SELECT t.id, t.nome, t.cnpj, t.contato, t.telefone, t.email, t.endereco, t.observacao, t.ativo, 'servico', 'aprovado'
FROM public.terceiros t
WHERE NOT EXISTS (SELECT 1 FROM public.fornecedores f WHERE f.id = t.id OR (t.cnpj IS NOT NULL AND f.cnpj = t.cnpj));
COMMENT ON TABLE public.terceiros IS 'DEPRECATED: unificado em fornecedores (tipo_parceiro servico/ambos)';