-- Create table for file share links
CREATE TABLE public.file_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for file_shares
CREATE POLICY "Users can view own shares"
  ON public.file_shares
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create shares for own files"
  ON public.file_shares
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.files WHERE id = file_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own shares"
  ON public.file_shares
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view active shares by token"
  ON public.file_shares
  FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create index for fast token lookups
CREATE INDEX idx_file_shares_token ON public.file_shares(share_token);