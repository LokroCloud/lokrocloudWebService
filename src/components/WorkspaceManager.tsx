import { useState, useEffect } from 'react';
import { useWorkspaces, Workspace } from '@/hooks/useWorkspaces';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Plus, MoreVertical, Trash2, UserPlus, Mail, X, Crown, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WorkspaceManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWorkspace?: (workspace: Workspace | null) => void;
}

const WorkspaceManager = ({ open, onOpenChange, onSelectWorkspace }: WorkspaceManagerProps) => {
  const { user } = useAuth();
  const {
    workspaces,
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
  } = useWorkspaces();

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchWorkspaces();
    }
  }, [open, fetchWorkspaces]);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchMembers(selectedWorkspace.id);
      fetchInvitations(selectedWorkspace.id);
    }
  }, [selectedWorkspace, fetchMembers, fetchInvitations]);

  const handleCreate = async () => {
    if (!newWorkspaceName.trim()) return;
    const workspace = await createWorkspace(newWorkspaceName);
    if (workspace) {
      setNewWorkspaceName('');
      setCreateDialogOpen(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedWorkspace) return;
    const invitation = await inviteMember(selectedWorkspace.id, inviteEmail);
    if (invitation) {
      setInviteEmail('');
      setInviteDialogOpen(false);
      fetchInvitations(selectedWorkspace.id);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Workspaces
          </DialogTitle>
        </DialogHeader>

        {selectedWorkspace ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedWorkspace(null)}>
                ← Back to workspaces
              </Button>
              <h3 className="font-semibold">{selectedWorkspace.name}</h3>
            </div>

            {/* Members */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Members ({members.length}/5)
                  </CardTitle>
                  {members.length < 5 && (
                    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="Enter email"
                              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleInvite}>Send Invite</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {member.profile?.username || 'Unknown'}
                      </span>
                      <Badge variant={getRoleBadgeVariant(member.role) as any} className="text-xs flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                    </div>
                    {member.role !== 'owner' && selectedWorkspace.owner_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{invitation.email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelInvitation(invitation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/join/${invitation.token}`}
                          readOnly
                          className="text-xs h-8"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/join/${invitation.token}`);
                            toast.success('Invite link copied!');
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Workspace
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspace-name">Workspace name</Label>
                      <Input
                        id="workspace-name"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="My Workspace"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No workspaces yet</p>
                <p className="text-sm">Create a workspace to share files with up to 5 members</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {workspaces.map((workspace) => (
                  <Card key={workspace.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                        }}
                      >
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium">{workspace.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {workspace.owner_id === user?.id ? 'Owner' : 'Member'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectWorkspace?.(workspace)}
                        >
                          Open
                        </Button>
                        {workspace.owner_id === user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => deleteWorkspace(workspace.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceManager;
