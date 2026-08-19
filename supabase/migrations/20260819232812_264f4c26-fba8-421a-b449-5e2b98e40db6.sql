
DO $$
DECLARE
    cid UUID;
BEGIN
    SELECT id INTO cid FROM public.clientes LIMIT 1;
    
    IF cid IS NOT NULL THEN
        INSERT INTO public.cliente_contatos (cliente_id, nome, cargo, email, telefone)
        VALUES (cid, 'João da Silva', 'Gerente de Manutenção', 'joao@cliente.com', '(11) 98765-4321');

        INSERT INTO public.cliente_equipamentos (cliente_id, nome, tipo, modelo, numero_serie)
        VALUES (cid, 'Bomba Hidráulica Rexroth', 'Bomba', 'A10VSO', 'SN-2024-001');

        INSERT INTO public.orcamentos (cliente_id, numero_orcamento, valor_total, status)
        VALUES (cid, 'ORC-2024-001', 15000.00, 'pendente');
    END IF;
END
$$;
