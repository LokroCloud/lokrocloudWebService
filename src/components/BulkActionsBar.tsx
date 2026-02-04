import { Button } from '@/components/ui/button';
import { Trash2, Download, X, CheckSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  isDeleting: boolean;
  isDownloading: boolean;
  totalItems: number;
}

const BulkActionsBar = ({
  selectedCount,
  onClearSelection,
  onSelectAll,
  onBulkDelete,
  onBulkDownload,
  isDeleting,
  isDownloading,
  totalItems,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span>{selectedCount} selected</span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-2">
        {selectedCount < totalItems && (
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDownload}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Creating ZIP...' : 'Download ZIP'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All selected files and folders will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
