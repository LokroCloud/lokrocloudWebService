-- Create workspace role enum
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace members table
CREATE TABLE public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, user_id)
);

-- Create workspace invitations table
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Add workspace_id to folders table (optional - files can belong to workspace)
ALTER TABLE public.folders ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to files table (optional - files can belong to workspace)
ALTER TABLE public.files ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Function to check if user is workspace member
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

-- Function to check if user is workspace owner or admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  );
$$;

-- Function to get workspace member count
CREATE OR REPLACE FUNCTION public.get_workspace_member_count(ws_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.workspace_members
  WHERE workspace_id = ws_id;
$$;

-- Workspaces policies
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT
USING (is_workspace_member(id) OR owner_id = auth.uid());

CREATE POLICY "Users can create workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces"
ON public.workspaces FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
ON public.workspaces FOR DELETE
USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Members can view workspace members"
ON public.workspace_members FOR SELECT
USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can add members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  is_workspace_admin(workspace_id) 
  AND get_workspace_member_count(workspace_id) < 5
);

CREATE POLICY "Admins can update members"
ON public.workspace_members FOR UPDATE
USING (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can remove members"
ON public.workspace_members FOR DELETE
USING (is_workspace_admin(workspace_id) OR user_id = auth.uid());

-- Workspace invitations policies
CREATE POLICY "Admins can view invitations"
ON public.workspace_invitations FOR SELECT
USING (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can create invitations"
ON public.workspace_invitations FOR INSERT
WITH CHECK (
  is_workspace_admin(workspace_id)
  AND get_workspace_member_count(workspace_id) < 5
);

CREATE POLICY "Admins can delete invitations"
ON public.workspace_invitations FOR DELETE
USING (is_workspace_admin(workspace_id));

CREATE POLICY "Anyone can view invitation by token"
ON public.workspace_invitations FOR SELECT
USING (expires_at > now());

-- Update files RLS to include workspace access
CREATE POLICY "Workspace members can view workspace files"
ON public.files FOR SELECT
USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can upload to workspace"
ON public.files FOR INSERT
WITH CHECK (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can delete workspace files"
ON public.files FOR DELETE
USING (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id));

-- Update folders RLS to include workspace access
CREATE POLICY "Workspace members can view workspace folders"
ON public.folders FOR SELECT
USING (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can create workspace folders"
ON public.folders FOR INSERT
WITH CHECK (workspace_id IS NOT NULL AND is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can delete workspace folders"
ON public.folders FOR DELETE
USING (workspace_id IS NOT NULL AND is_workspace_admin(workspace_id));

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();