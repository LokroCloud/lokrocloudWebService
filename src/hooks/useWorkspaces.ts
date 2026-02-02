import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  profile?: {
    username: string;
  };
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  invited_by: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export const useWorkspaces = () => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkspaces(data as Workspace[]);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createWorkspace = async (name: string) => {
    if (!user) return null;

    try {
      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (wsError) throw wsError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
          invited_by: user.id,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      toast.success('Workspace created');
      await fetchWorkspaces();
      return workspace as Workspace;
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error('Failed to create workspace');
      return null;
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;
      toast.success('Workspace deleted');
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(null);
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error('Failed to delete workspace');
    }
  };

  const fetchMembers = useCallback(async (workspaceId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          profile:profiles!workspace_members_user_id_fkey(username)
        `)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      setMembers(data as unknown as WorkspaceMember[]);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    }
  }, [user]);

  const inviteMember = async (workspaceId: string, email: string) => {
    if (!user) return null;

    try {
      // Check member count
      const { data: countData } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId);

      if (countData && countData.length >= 5) {
        toast.error('Workspace is full (max 5 members)');
        return null;
      }

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Invitation sent');
      return data as WorkspaceInvitation;
    } catch (error: any) {
      console.error('Error inviting member:', error);
      if (error.code === '23505') {
        toast.error('User already invited');
      } else {
        toast.error('Failed to send invitation');
      }
      return null;
    }
  };

  const fetchInvitations = useCallback(async (workspaceId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      setInvitations(data as WorkspaceInvitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [user]);

  const cancelInvitation = async (invitationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation cancelled');
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Member removed');
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const acceptInvitation = async (token: string) => {
    if (!user) return false;

    try {
      // Find invitation
      const { data: invitation, error: findError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (findError || !invitation) {
        toast.error('Invalid or expired invitation');
        return false;
      }

      // Add as member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: 'member',
          invited_by: invitation.invited_by,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Delete invitation
      await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitation.id);

      toast.success('Joined workspace successfully');
      await fetchWorkspaces();
      return true;
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      if (error.code === '23505') {
        toast.error('You are already a member');
      } else {
        toast.error('Failed to join workspace');
      }
      return false;
    }
  };

  return {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    members,
    invitations,
    loading,
    fetchWorkspaces,
    createWorkspace,
    deleteWorkspace,
    fetchMembers,
    inviteMember,
    fetchInvitations,
    cancelInvitation,
    removeMember,
    acceptInvitation,
  };
};
