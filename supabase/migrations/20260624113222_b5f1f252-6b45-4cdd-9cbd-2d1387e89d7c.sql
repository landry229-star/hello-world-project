
-- Lock down trigger/helper SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
-- has_role is intentionally callable by authenticated (used in policies + app code)

-- Storage policies: product-images (read public, write admin)
CREATE POLICY "product-images public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "product-images admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product-images admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "product-images admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: digital-products (admin write, customers cannot list directly; downloads go through server function with signed URLs)
CREATE POLICY "digital-products admin all" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'digital-products' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'digital-products' AND public.has_role(auth.uid(), 'admin'));
