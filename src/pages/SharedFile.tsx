import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Download, File, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SharedFileData {
  file_id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const SharedFile = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileData, setFileData] = useState<SharedFileData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchSharedFile = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        // First get the share record
        const { data: shareData, error: shareError } = await supabase
          .from('file_shares')
          .select('file_id, is_active, expires_at')
          .eq('share_token', token)
          .single();

        if (shareError || !shareData) {
          setError('Share link not found or has expired');
          setLoading(false);
          return;
        }

        if (!shareData.is_active) {
          setError('This share link has been deactivated');
          setLoading(false);
          return;
        }

        if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
          setError('This share link has expired');
          setLoading(false);
          return;
        }

        // Now get the file info using the service role via an edge function or direct query
        // Since RLS is enabled on files, we need to fetch file info differently
        // We'll use a simple approach: query the file_shares join with files
        const { data: fileInfo, error: fileError } = await supabase
          .from('file_shares')
          .select(`
            file_id,
            files!inner(
              file_name,
              file_path,
              mime_type,
              file_size
            )
          `)
          .eq('share_token', token)
          .eq('is_active', true)
          .single();

        if (fileError || !fileInfo) {
          setError('Unable to load file information');
          setLoading(false);
          return;
        }

        const file = (fileInfo as any).files;
        setFileData({
          file_id: fileInfo.file_id,
          file_name: file.file_name,
          file_path: file.file_path,
          mime_type: file.mime_type,
          file_size: file.file_size,
        });

        // Generate signed URL for preview
        const { data: signedData, error: signedError } = await supabase.storage
          .from('user-files')
          .createSignedUrl(file.file_path, 3600);

        if (!signedError && signedData) {
          setPreviewUrl(signedData.signedUrl);
        }
      } catch (err) {
        console.error('Error fetching shared file:', err);
        setError('An error occurred while loading the file');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedFile();
  }, [token]);

  const handleDownload = async () => {
    if (!fileData) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(fileData.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const mimeType = fileData?.mime_type || '';
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-16 w-16 text-primary" />;
    if (isPdf) return <FileText className="h-16 w-16 text-primary" />;
    return <File className="h-16 w-16 text-muted-foreground" />;
  };

  const renderPreview = () => {
    if (!previewUrl) return null;

    if (isImage) {
      return (
        <div className="flex items-center justify-center max-h-[60vh] overflow-hidden rounded-lg bg-muted/30">
          <img 
            src={previewUrl} 
            alt={fileData?.file_name} 
            className="max-w-full max-h-[60vh] object-contain"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[60vh] rounded-lg border border-border"
          title={fileData?.file_name}
        />
      );
    }

    if (isVideo) {
      return (
        <video 
          src={previewUrl} 
          controls 
          className="w-full max-h-[60vh] rounded-lg"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <File className="h-16 w-16 text-primary" />
          <audio src={previewUrl} controls className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-center px-4 py-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CloudVault</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 max-w-4xl">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unable to Access File</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : fileData ? (
          <div className="space-y-6 mt-8">
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-4 mb-6">
                  {getFileIcon()}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold truncate">{fileData.file_name}</h1>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(fileData.file_size)}
                      {fileData.mime_type && ` • ${fileData.mime_type}`}
                    </p>
                  </div>
                  <Button onClick={handleDownload} disabled={downloading}>
                    <Download className="mr-2 h-4 w-4" />
                    {downloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>

                {renderPreview()}

                {!previewUrl && !isImage && !isPdf && !isVideo && !isAudio && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <File className="h-16 w-16 mb-4" />
                    <p>Preview not available for this file type</p>
                    <p className="text-sm">Click download to save the file</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
              Shared via CloudVault
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SharedFile;