DROP POLICY IF EXISTS "empresa_assets_leitura" ON storage.objects;
CREATE POLICY "empresa_assets_leitura" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'empresa-assets');

DROP POLICY IF EXISTS "empresa_assets_gestao" ON storage.objects;
CREATE POLICY "empresa_assets_gestao" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'empresa-assets' AND (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro')))
  WITH CHECK (bucket_id = 'empresa-assets' AND (public.has_role(auth.uid(),'diretor') OR public.has_role(auth.uid(),'administrativo_financeiro')));