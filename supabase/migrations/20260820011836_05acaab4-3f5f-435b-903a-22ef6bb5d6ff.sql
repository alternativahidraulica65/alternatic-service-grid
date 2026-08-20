CREATE POLICY "Avatar public access" ON storage.objects FOR SELECT USING (bucket_id = 'user-profiles-private');
CREATE POLICY "Avatar owner upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-profiles-private' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatar owner update" ON storage.objects FOR UPDATE USING (bucket_id = 'user-profiles-private' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Avatar owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'user-profiles-private' AND auth.uid()::text = (storage.foldername(name))[1]);
