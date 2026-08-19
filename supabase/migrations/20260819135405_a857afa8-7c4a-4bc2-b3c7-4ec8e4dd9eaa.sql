-- Seed some test data for suppliers/financials
INSERT INTO public.lancamentos_financeiros (fornecedor_id, valor, data_competencia, descricao, tipo)
SELECT id, 1250.00, current_date, 'Compra de retentores', 'saida'
FROM public.fornecedores WHERE nome = 'Hidráulica Central';

INSERT INTO public.lancamentos_financeiros (fornecedor_id, valor, data_competencia, descricao, tipo)
SELECT id, 850.50, current_date, 'Óleo hidráulico AW-68', 'saida'
FROM public.fornecedores WHERE nome = 'Óleos & Cia';

INSERT INTO public.lancamentos_financeiros (fornecedor_id, valor, data_competencia, descricao, tipo)
SELECT id, 3400.00, current_date, 'Usinagem de eixo', 'saida'
FROM public.fornecedores WHERE nome = 'Metalúrgica Sul';
