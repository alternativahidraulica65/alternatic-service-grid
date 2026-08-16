
-- Políticas de Storage para o bucket os-assets
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'os-assets');

CREATE POLICY "Permitir leitura para usuários autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'os-assets');

CREATE POLICY "Permitir exclusão para usuários autenticados"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'os-assets');
