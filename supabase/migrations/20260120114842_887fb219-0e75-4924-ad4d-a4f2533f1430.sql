-- Add RLS policy on files table to allow reading files that have active shares
CREATE POLICY "Public can view files with active shares"
  ON public.files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.file_shares 
      WHERE file_shares.file_id = files.id 
      AND file_shares.is_active = true 
      AND (file_shares.expires_at IS NULL OR file_shares.expires_at > now())
    )
  );