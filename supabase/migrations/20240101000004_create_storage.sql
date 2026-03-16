-- Create the payment-proofs bucket as private (not publicly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage.objects for payment-proofs bucket
-- Pattern: user uploads to a path prefixed with their own user_id/
-- e.g. storage path: payment-proofs/{user_id}/{filename}

-- Authenticated users can upload to their own folder
CREATE POLICY "payment_proofs_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can read their own files
CREATE POLICY "payment_proofs_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Admins can read all files in the bucket
CREATE POLICY "payment_proofs_read_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete files (for moderation)
CREATE POLICY "payment_proofs_delete_admin" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'payment-proofs'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
