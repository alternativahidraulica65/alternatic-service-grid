
-- Função para buscar estatísticas de storage
CREATE OR REPLACE FUNCTION public.dev_get_storage_stats()
RETURNS TABLE (
    nome_bucket text,
    quantidade_arquivos bigint,
    total_bytes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.name::text as nome_bucket,
        count(o.id)::bigint as quantidade_arquivos,
        coalesce(sum(o.metadata->>'size')::bigint, 0) as total_bytes
    FROM storage.buckets b
    LEFT JOIN storage.objects o ON b.id = o.bucket_id
    GROUP BY b.name;
END;
$$;

-- Grant para autenticados e service_role
GRANT EXECUTE ON FUNCTION public.dev_get_storage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_get_storage_stats() TO service_role;
