import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Play, Save, X, Code, FileCode, Palette, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CodeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file?: {
    id: string;
    file_name: string;
    file_path: string;
    mime_type: string | null;
  } | null;
  onSave?: () => void;
}

const getLanguage = (mimeType: string | null, fileName: string): string => {
  if (mimeType?.includes('html') || fileName.endsWith('.html')) return 'html';
  if (mimeType?.includes('css') || fileName.endsWith('.css')) return 'css';
  if (mimeType?.includes('javascript') || fileName.endsWith('.js')) return 'javascript';
  if (mimeType?.includes('json') || fileName.endsWith('.json')) return 'json';
  if (mimeType?.includes('xml') || fileName.endsWith('.xml')) return 'xml';
  if (fileName.endsWith('.md')) return 'markdown';
  return 'plaintext';
};

const CodeEditor = ({ open, onOpenChange, file, onSave }: CodeEditorProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const language = file ? getLanguage(file.mime_type, file.file_name) : 'html';
  const isHtml = language === 'html';

  useEffect(() => {
    if (!open || !file) {
      setContent('');
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('user-files')
          .download(file.file_path);

        if (error) throw error;
        const text = await data.text();
        setContent(text);
      } catch (error) {
        console.error('Error loading file:', error);
        toast.error('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [open, file]);

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const blob = new Blob([content], { type: file.mime_type || 'text/plain' });
      const { error } = await supabase.storage
        .from('user-files')
        .update(file.file_path, blob, { upsert: true });

      if (error) throw error;
      toast.success('File saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const refreshPreview = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const getPreviewContent = () => {
    if (language === 'html') {
      return content;
    }
    if (language === 'css') {
      return `<!DOCTYPE html><html><head><style>${content}</style></head><body><div class="demo">CSS Preview - Add HTML elements to see styles</div></body></html>`;
    }
    if (language === 'javascript') {
      return `<!DOCTYPE html><html><head></head><body><pre id="output"></pre><script>
        const log = console.log;
        console.log = (...args) => {
          document.getElementById('output').textContent += args.join(' ') + '\\n';
          log(...args);
        };
        try { ${content} } catch(e) { console.log('Error: ' + e.message); }
      </script></body></html>`;
    }
    return `<pre>${content}</pre>`;
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isFullscreen ? 'max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh]' : 'max-w-6xl w-[95vw] h-[85vh]'} flex flex-col p-0`}>
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            <span className="truncate">{file.file_name}</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Code className="h-4 w-4" />
                      <span className="font-medium capitalize">{language}</span>
                    </div>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  <div className="flex-1">
                    <Editor
                      height="100%"
                      language={language}
                      value={content}
                      onChange={(value) => setContent(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        padding: { top: 10 },
                      }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full flex flex-col bg-white">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Play className="h-4 w-4" />
                      <span className="font-medium">Live Preview</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={refreshPreview}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <iframe
                      key={previewKey}
                      srcDoc={getPreviewContent()}
                      className="w-full h-full border-0"
                      title="Preview"
                      sandbox="allow-scripts"
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CodeEditor;
