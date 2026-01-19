-- Create is_admin function first
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create is_owner function
CREATE OR REPLACE FUNCTION public.is_owner(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN check_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create is_owner_or_admin function
CREATE OR REPLACE FUNCTION public.is_owner_or_admin(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN check_user_id = auth.uid() OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  access_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  credit_balance NUMERIC NOT NULL DEFAULT 0,
  storage_limit BIGINT NOT NULL DEFAULT 5368709120, -- 5 GB in bytes
  storage_used BIGINT NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folders table
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage_upgrades table
CREATE TABLE public.storage_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  storage_added BIGINT NOT NULL,
  credit_cost NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  credit_amount NUMERIC NOT NULL,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'voucher_redemption', 'storage_purchase', 'credit_adjustment'
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- Reference to voucher or storage_upgrade id
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (is_owner_or_admin(id));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (is_owner(id))
  WITH CHECK (is_owner(id));

CREATE POLICY "System can insert profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Folders RLS policies
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can create own folders" ON public.folders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (is_owner(user_id));

CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (is_owner(user_id));

-- Files RLS policies
CREATE POLICY "Users can view own files" ON public.files
  FOR SELECT USING (is_owner_or_admin(user_id));

CREATE POLICY "Users can insert own files" ON public.files
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own files" ON public.files
  FOR UPDATE USING (is_owner(user_id));

CREATE POLICY "Users can delete own files" ON public.files
  FOR DELETE USING (is_owner(user_id));

-- Storage upgrades RLS policies (publicly viewable)
CREATE POLICY "Anyone can view storage upgrades" ON public.storage_upgrades
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage storage upgrades" ON public.storage_upgrades
  FOR ALL USING (is_admin());

-- Vouchers RLS policies (admin only)
CREATE POLICY "Admins can view vouchers" ON public.vouchers
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can create vouchers" ON public.vouchers
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update vouchers" ON public.vouchers
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete vouchers" ON public.vouchers
  FOR DELETE USING (is_admin());

-- Transactions RLS policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (is_owner_or_admin(user_id));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile automatically on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
BEGIN
  -- Generate username from email or use a default
  new_username := COALESCE(
    SPLIT_PART(NEW.email, '@', 1),
    'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)
  );
  
  -- Ensure uniqueness by appending random chars if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
    new_username := new_username || '_' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4);
  END LOOP;
  
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, new_username);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default storage upgrade tiers
INSERT INTO public.storage_upgrades (name, storage_added, credit_cost) VALUES
  ('+5 GB Storage', 5368709120, 100),
  ('+10 GB Storage', 10737418240, 175),
  ('+25 GB Storage', 26843545600, 400);

-- Create storage bucket for user files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-files', 'user-files', false);

-- Storage bucket RLS policies
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);