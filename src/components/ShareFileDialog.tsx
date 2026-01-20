import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Link2, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ShareFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    file_name: string;
  } | null;
}

interface ShareLink {
  id: string;
  share_token: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const ShareFileDialog = ({ open, onOpenChange, file }: ShareFileDialogProps) => {
  const { user } = useAuth();
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiresEnabled, setExpiresEnabled] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (open && file) {
      fetchShareLinks();
    }
  }, [open, file]);

  const fetchShareLinks = async () => {
    if (!file || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('file_shares')
        .select('*')
        .eq('file_id', file.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShareLinks(data as ShareLink[]);
    } catch (error) {
      console.error('Error fetching share links:', error);
      toast.error('Failed to load share links');
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    if (!file || !user) return;

    setCreating(true);
    try {
      const expiresAt = expiresEnabled 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('file_shares')
        .insert({
          file_id: file.id,
          user_id: user.id,
          expires_at: expiresAt,
        });

      if (error) throw error;
      toast.success('Share link created');
      await fetchShareLinks();
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const deleteShareLink = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('file_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      toast.success('Share link deleted');
      setShareLinks(prev => prev.filter(s => s.id !== shareId));
    } catch (error) {
      console.error('Error deleting share link:', error);
      toast.error('Failed to delete share link');
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/shared/${token}`;
  };

  const copyToClipboard = async (token: string) => {
    const url = getShareUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share File
          </DialogTitle>
          <DialogDescription className="truncate">
            {file.file_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Create new share link */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium text-sm">Create New Share Link</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="expires" className="text-sm">Set expiration</Label>
              <Switch 
                id="expires" 
                checked={expiresEnabled} 
                onCheckedChange={setExpiresEnabled}
              />
            </div>

            {expiresEnabled && (
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Expires in</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}

            <Button 
              onClick={createShareLink} 
              disabled={creating}
              className="w-full"
            >
              {creating ? 'Creating...' : 'Create Share Link'}
            </Button>
          </div>

          {/* Existing share links */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Active Share Links</h4>
            
            {loading ? (
              <div className="text-center text-muted-foreground py-4">Loading...</div>
            ) : shareLinks.length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-sm">
                No share links yet
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shareLinks.map((share) => (
                  <div 
                    key={share.id} 
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      isExpired(share.expires_at) ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate text-muted-foreground">
                        {getShareUrl(share.share_token)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {formatDate(share.created_at)}
                        {share.expires_at && (
                          <span className={isExpired(share.expires_at) ? 'text-destructive' : ''}>
                            {isExpired(share.expires_at) 
                              ? ` • Expired` 
                              : ` • Expires ${formatDate(share.expires_at)}`
                            }
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(share.share_token)}
                      disabled={isExpired(share.expires_at)}
                    >
                      {copied === share.share_token ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteShareLink(share.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareFileDialog;
