-- Deletar Ordens de Serviço vinculadas às empresas fictícias
DELETE FROM public.ordens_servico 
WHERE cliente_id IN (
    SELECT id FROM public.clientes 
    WHERE nome ILIKE '%hidrometal sa%' OR nome ILIKE '%agrofortes ltda%'
);

-- Deletar os clientes fictícios
DELETE FROM public.clientes 
WHERE nome ILIKE '%hidrometal sa%' OR nome ILIKE '%agrofortes ltda%';