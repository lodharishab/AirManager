import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUploadImages, useCreateGalleryImage } from "@/lib/api";
import { Upload, X, ImageIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Property {
  id: number;
  name: string;
}

interface ImageUploadZoneProps {
  properties: Property[];
  propertyId?: number;
  onComplete?: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"];
const MAX_SIZE = 10 * 1024 * 1024;

interface QueuedFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  url?: string;
}

export function ImageUploadZone({ properties, propertyId: defaultPropertyId, onComplete }: ImageUploadZoneProps) {
  const { toast } = useToast();
  const uploadImages = useUploadImages();
  const createGalleryImage = useCreateGalleryImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>(defaultPropertyId || 0);
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const validateFiles = useCallback((fileList: FileList | File[]): QueuedFile[] => {
    const files = Array.from(fileList);
    return files.map((file) => {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return { file, id, status: "error" as const, progress: 0, error: "Only JPEG, PNG, WebP, MP4, MOV and WebM files are accepted" };
      }
      if (file.size > MAX_SIZE) {
        return { file, id, status: "error" as const, progress: 0, error: "File size must be under 10MB" };
      }
      return { file, id, status: "pending" as const, progress: 0 };
    });
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const validated = validateFiles(fileList);
    setQueuedFiles((prev) => [...prev, ...validated]);
  }, [validateFiles]);

  const removeFile = useCallback((id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleUpload = async () => {
    const pendingFiles = queuedFiles.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setQueuedFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const, progress: 50 } : f))
    );

    try {
      const result = await uploadImages.mutateAsync(pendingFiles.map((f) => f.file));

      const uploadedMap = new Map(result.uploaded.map((u) => [u.originalName, u.url]));
      const errorMap = new Map(result.errors.map((e) => [e.file, e.error]));

      setQueuedFiles((prev) =>
        prev.map((f) => {
          if (f.status !== "uploading") return f;
          const url = uploadedMap.get(f.file.name);
          const error = errorMap.get(f.file.name);
          if (url) return { ...f, status: "done" as const, progress: 100, url };
          if (error) return { ...f, status: "error" as const, progress: 0, error };
          return f;
        })
      );

      const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      for (const uploaded of result.uploaded) {
        await createGalleryImage.mutateAsync({
          imageUrl: uploaded.url,
          title: uploaded.originalName.replace(/\.[^.]+$/, ""),
          tags: tagList,
          propertyId: selectedPropertyId || undefined,
          starRating: 0,
          source: "upload",
        });
      }

      if (result.uploaded.length > 0) {
        toast({ title: `${result.uploaded.length} image(s) uploaded successfully` });
      }
      if (result.errors.length > 0) {
        toast({ title: `${result.errors.length} file(s) failed to upload`, variant: "destructive" });
      }

      onComplete?.();
    } catch (err: unknown) {
      toast({ title: (err instanceof Error ? err.message : String(err)) || "Upload failed", variant: "destructive" });
      setQueuedFiles((prev) =>
        prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" as const, progress: 0, error: "Upload failed" } : f))
      );
    } finally {
      setIsUploading(false);
    }
  };

  const pendingCount = queuedFiles.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-4">
      <div
        data-testid="dropzone-upload"
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
          isDragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          data-testid="input-file-upload"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          multiple
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">Drag & drop images here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, MP4, MOV or WebM up to 10MB each</p>
      </div>

      {queuedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Assign to Property</Label>
              <Select value={String(selectedPropertyId)} onValueChange={(v) => setSelectedPropertyId(Number(v))}>
                <SelectTrigger data-testid="select-upload-property" className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Tags (comma separated)</Label>
              <Input
                data-testid="input-upload-tags"
                className="h-9"
                placeholder="e.g. bedroom, exterior"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {queuedFiles.map((qf) => (
              <div key={qf.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50 text-sm">
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{qf.file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{(qf.file.size / 1024 / 1024).toFixed(1)}MB</span>
                {qf.status === "uploading" && <Progress value={qf.progress} className="w-16 h-1.5" />}
                {qf.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                {qf.status === "error" && (
                  <span className="flex items-center gap-1 text-xs text-destructive shrink-0">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {qf.error}
                  </span>
                )}
                {qf.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeFile(qf.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <Button
              data-testid="button-clear-uploads"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setQueuedFiles([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              data-testid="button-start-upload"
              size="sm"
              className="rounded-xl text-primary-foreground"
              onClick={handleUpload}
              disabled={pendingCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
