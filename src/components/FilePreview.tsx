import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import { toast } from 'sonner';

interface FilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    file_name: string;
    file_path: string;
    mime_type: string | null;
  } | null;
  onDownload: () => void;
}

const FilePreview = ({ open, onOpenChange, file, onDownload }: FilePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !file) {
      setPreviewUrl(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('user-files')
          .createSignedUrl(file.file_path, 3600);

        if (error) throw error;
        setPreviewUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading preview:', error);
        toast.error('Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [open, file]);

  if (!file) return null;

  const mimeType = file.mime_type || '';
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isText = mimeType.startsWith('text/') || 
    ['application/json', 'application/javascript', 'application/xml'].includes(mimeType);

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
          <File className="h-16 w-16 mb-4" />
          <p>Unable to load preview</p>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center max-h-[70vh] overflow-hidden">
          <img 
            src={previewUrl} 
            alt={file.file_name} 
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] rounded-lg border border-border"
          title={file.file_name}
        />
      );
    }

    if (isVideo) {
      return (
        <video 
          src={previewUrl} 
          controls 
          className="w-full max-h-[70vh] rounded-lg"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <File className="h-16 w-16 text-primary" />
          <audio src={previewUrl} controls className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    // For text and other files, show a generic preview
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
        {isText ? (
          <FileText className="h-16 w-16" />
        ) : (
          <File className="h-16 w-16" />
        )}
        <p className="text-center">
          Preview not available for this file type.
          <br />
          <span className="text-sm">Click download to view the file.</span>
        </p>
      </div>
    );
  };

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-5 w-5" />;
    if (isPdf || isText) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            {getFileIcon()}
            <span className="truncate">{file.file_name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderPreview()}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <Button onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;