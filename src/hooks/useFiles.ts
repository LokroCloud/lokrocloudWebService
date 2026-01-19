import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FileItem {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FolderItem {
  id: string;
  user_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useFiles = () => {
  const { user, refreshProfile } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async (folderId: string | null = null) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFiles(data as FileItem[]);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchFolders = useCallback(async (parentFolderId: string | null = null) => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (parentFolderId) {
        query = query.eq('parent_folder_id', parentFolderId);
      } else {
        query = query.is('parent_folder_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFolders(data as FolderItem[]);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    }
  }, [user]);

  const createFolder = async (name: string, parentFolderId: string | null = null) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name,
          parent_folder_id: parentFolderId,
        });

      if (error) throw error;
      toast.success('Folder created');
      await fetchFolders(parentFolderId);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const uploadFile = async (file: File, folderId: string | null = null) => {
    if (!user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          folder_id: folderId,
        });

      if (dbError) throw dbError;

      // Update storage used in profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('storage_used')
        .eq('id', user.id)
        .single();

      const newStorageUsed = (profile?.storage_used || 0) + file.size;
      
      await supabase
        .from('profiles')
        .update({ storage_used: newStorageUsed })
        .eq('id', user.id);

      toast.success('File uploaded');
      await fetchFiles(folderId);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string, fileSize: number) => {
    if (!user) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast.success('File deleted');
      setFiles(prev => prev.filter(f => f.id !== fileId));
      await refreshProfile();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      toast.success('Folder deleted');
      setFolders(prev => prev.filter(f => f.id !== folderId));
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  return {
    files,
    folders,
    loading,
    uploading,
    fetchFiles,
    fetchFolders,
    createFolder,
    uploadFile,
    deleteFile,
    deleteFolder,
    downloadFile,
  };
};