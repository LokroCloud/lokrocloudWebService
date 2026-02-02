import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  itemType: 'file' | 'folder';
  onRename: (newName: string) => Promise<void>;
}

const RenameDialog = ({ open, onOpenChange, currentName, itemType, onRename }: RenameDialogProps) => {
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName]);

  const handleRename = async () => {
    if (!newName.trim() || newName === currentName) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      await onRename(newName.trim());
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {itemType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">New name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              placeholder={`Enter ${itemType} name`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={loading || !newName.trim()}>
            {loading ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameDialog;
