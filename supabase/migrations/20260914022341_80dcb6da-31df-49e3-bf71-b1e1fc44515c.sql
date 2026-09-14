CREATE POLICY "Autenticados podem ver vendedores"
ON public.vendedores
FOR SELECT
TO authenticated
USING (true);