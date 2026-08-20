-- RPC 1: Faturamento Mensal Real
CREATE OR REPLACE FUNCTION public.get_faturamento_mensal()
RETURNS TABLE (mes TEXT, valor NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    to_char(data_abertura, 'Mon') as mes,
    SUM(COALESCE(valor_total, 0)) as valor
  FROM public.ordens_servico
  WHERE data_abertura >= now() - interval '6 months'
  GROUP BY to_char(data_abertura, 'Mon'), date_trunc('month', data_abertura)
  ORDER BY date_trunc('month', data_abertura);
$$;

-- RPC 2: Produtividade Técnicos Real
CREATE OR REPLACE FUNCTION public.get_produtividade_tecnicos()
RETURNS TABLE (tecnico TEXT, os BIGINT, media NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.nome as tecnico,
    count(os.id) as os,
    4.5 as media -- Placeholder para média de avaliação futura
  FROM public.usuarios u
  JOIN public.ordens_servico os ON os.tecnico_id = u.id
  WHERE os.status = 'entregue'
  GROUP BY u.nome
  ORDER BY os DESC
  LIMIT 5;
$$;

-- RPC 3: Distribuição Status OS Real
CREATE OR REPLACE FUNCTION public.get_distribuicao_status_os()
RETURNS TABLE (name TEXT, value BIGINT, color TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    status as name,
    count(*) as value,
    CASE 
      WHEN status = 'aberta' THEN '#f59e0b'
      WHEN status = 'vistoria' THEN '#3b82f6'
      WHEN status = 'aprovada' THEN '#10b981'
      WHEN status = 'pronto' THEN '#1e293b'
      ELSE '#64748b'
    END as color
  FROM public.ordens_servico
  GROUP BY status;
$$;

GRANT EXECUTE ON FUNCTION public.get_faturamento_mensal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_produtividade_tecnicos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distribuicao_status_os() TO authenticated;
