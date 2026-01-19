import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFiles, FileItem, FolderItem } from '@/hooks/useFiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Cloud, Upload, FolderPlus, File, Folder, Download, Trash2, MoreVertical, LogOut, Store, Settings, ChevronLeft, Search, Coins, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const { files, folders, loading, uploading, fetchFiles, fetchFolders, createFolder, uploadFile, deleteFile, deleteFolder, downloadFile } = useFiles();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Files' }]);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFiles(currentFolderId);
    fetchFolders(currentFolderId);
  }, [currentFolderId, fetchFiles, fetchFolders]);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList) return;
    
    const remainingStorage = (profile?.storage_limit || 0) - (profile?.storage_used || 0);
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > remainingStorage) {
        toast.error(`Not enough storage for ${file.name}`);
        continue;
      }
      await uploadFile(file, currentFolderId);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [currentFolderId]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName, currentFolderId);
    setNewFolderName('');
    setFolderDialogOpen(false);
  };

  const navigateToFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
  };

  const navigateBack = () => {
    if (folderPath.length <= 1) return;
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1].id);
  };

  const storagePercent = profile ? (profile.storage_used / profile.storage_limit) * 100 : 0;

  const filteredFiles = files.filter(f => f.file_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CloudVault</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-warning" />
              <span className="font-medium">{profile?.credit_balance || 0} credits</span>
            </div>
            <Link to="/shop">
              <Button variant="outline" size="sm">
                <Store className="mr-2 h-4 w-4" />
                Shop
              </Button>
            </Link>
            {profile?.is_admin && (
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4">
        {/* Storage Bar */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Storage</span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(profile?.storage_used || 0)} / {formatBytes(profile?.storage_limit || 0)}
              </span>
            </div>
            <Progress value={storagePercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            {folderPath.length > 1 && (
              <Button variant="ghost" size="sm" onClick={navigateBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="font-medium">{folderPath[folderPath.length - 1].name}</span>
          </div>
          
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <Button onClick={handleCreateFolder} className="w-full">
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <label>
              <Button asChild disabled={uploading}>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </span>
              </Button>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Drop Zone & File Grid */}
        <div
          className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Loading...
            </div>
          ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Upload className="h-12 w-12 mb-4" />
              <p>Drag and drop files here or click Upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
              {filteredFolders.map((folder) => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigateToFolder(folder)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Folder className="h-12 w-12 text-primary mb-2" />
                    <span className="text-sm font-medium truncate w-full">{folder.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
              
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:bg-accent transition-colors">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <File className="h-12 w-12 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium truncate w-full">{file.file_name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => downloadFile(file.file_path, file.file_name)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteFile(file.id, file.file_path, file.file_size)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;