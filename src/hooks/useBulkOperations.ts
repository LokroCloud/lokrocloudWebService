import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileItem, FolderItem } from './useFiles';

interface BulkOperationsProps {
  deleteFile: (id: string, filePath: string, fileSize: number) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  onComplete: () => void;
}

export const useBulkOperations = ({ deleteFile, deleteFolder, onComplete }: BulkOperationsProps) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const toggleFolderSelection = useCallback((folderId: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const selectAllFiles = useCallback((files: FileItem[]) => {
    setSelectedFiles(new Set(files.map((f) => f.id)));
  }, []);

  const selectAllFolders = useCallback((folders: FolderItem[]) => {
    setSelectedFolders(new Set(folders.map((f) => f.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, []);

  const bulkDelete = useCallback(async (files: FileItem[], folders: FolderItem[]) => {
    setIsDeleting(true);
    try {
      // Delete selected folders first
      for (const folderId of selectedFolders) {
        await deleteFolder(folderId);
      }

      // Delete selected files
      for (const fileId of selectedFiles) {
        const file = files.find((f) => f.id === fileId);
        if (file) {
          await deleteFile(file.id, file.file_path, file.file_size);
        }
      }

      toast.success(`Deleted ${selectedFiles.size + selectedFolders.size} items`);
      clearSelection();
      onComplete();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete some items');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedFiles, selectedFolders, deleteFile, deleteFolder, clearSelection, onComplete]);

  const bulkDownload = useCallback(async (files: FileItem[]) => {
    if (selectedFiles.size === 0) {
      toast.error('No files selected');
      return;
    }

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      for (const fileId of selectedFiles) {
        const file = files.find((f) => f.id === fileId);
        if (!file) continue;

        const { data, error } = await supabase.storage
          .from('user-files')
          .download(file.file_path);

        if (error) {
          console.error(`Error downloading ${file.file_name}:`, error);
          continue;
        }

        zip.file(file.file_name, data);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `files-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${selectedFiles.size} files as ZIP`);
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error('Failed to create ZIP file');
    } finally {
      setIsDownloading(false);
    }
  }, [selectedFiles]);

  const isFileSelected = useCallback((fileId: string) => selectedFiles.has(fileId), [selectedFiles]);
  const isFolderSelected = useCallback((folderId: string) => selectedFolders.has(folderId), [selectedFolders]);

  const selectedCount = selectedFiles.size + selectedFolders.size;

  return {
    selectedFiles,
    selectedFolders,
    selectedCount,
    isDeleting,
    isDownloading,
    toggleFileSelection,
    toggleFolderSelection,
    selectAllFiles,
    selectAllFolders,
    clearSelection,
    bulkDelete,
    bulkDownload,
    isFileSelected,
    isFolderSelected,
  };
};
