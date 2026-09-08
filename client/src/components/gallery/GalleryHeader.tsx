import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateGalleryImage, useImportFromDrive } from "@/lib/api";
import { Plus, Search, Loader2, HardDrive, Upload } from "lucide-react";
import { ImageUploadZone } from "./ImageUploadZone";

interface Property {
  id: number;
  name: string;
}

interface GalleryHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  properties: Property[];
}

export function GalleryHeader({ searchTerm, onSearchChange, properties }: GalleryHeaderProps) {
  const { toast } = useToast();
  const createImage = useCreateGalleryImage();
  const importDrive = useImportFromDrive();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newImage, setNewImage] = useState({ imageUrl: "", title: "", tags: "", propertyId: 0 });
  const [driveUrl, setDriveUrl] = useState("");
  const [drivePropertyId, setDrivePropertyId] = useState(0);

  const handleAddImage = () => {
    if (!newImage.imageUrl) {
      toast({ title: "Image URL is required", variant: "destructive" });
      return;
    }
    const tags = newImage.tags ? newImage.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    createImage.mutate(
      {
        imageUrl: newImage.imageUrl,
        title: newImage.title || undefined,
        tags,
        propertyId: newImage.propertyId || undefined,
        starRating: 0,
      },
      {
        onSuccess: () => {
          toast({ title: "Image added to gallery" });
          setAddDialogOpen(false);
          setNewImage({ imageUrl: "", title: "", tags: "", propertyId: 0 });
        },
      }
    );
  };

  const handleImportDrive = () => {
    if (!driveUrl) {
      toast({ title: "Please enter a Google Drive folder URL", variant: "destructive" });
      return;
    }
    importDrive.mutate(
      { folderUrl: driveUrl, propertyId: drivePropertyId || undefined },
      {
        onSuccess: (data) => {
          toast({ title: data.message });
          setDriveDialogOpen(false);
          setDriveUrl("");
        },
        onError: (err: Error) => {
          toast({ title: err.message || "Failed to import", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 data-testid="text-gallery-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Gallery</h1>
        <p className="text-muted-foreground mt-1">Manage property photos with tags, titles, and ratings.</p>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
        <div className="relative w-full md:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-testid="input-search-gallery"
            placeholder="Search images..."
            className="pl-9 rounded-xl"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <Dialog open={driveDialogOpen} onOpenChange={setDriveDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-import-drive" variant="outline" className="rounded-xl shrink-0">
              <HardDrive className="mr-2 h-4 w-4" /> Google Drive
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Import from Google Drive</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                Paste a Google Drive folder link to import all images from it. Make sure the folder is shared publicly or with "anyone with the link".
              </div>
              <div className="space-y-2">
                <Label>Folder URL or ID</Label>
                <Input
                  data-testid="input-drive-url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Assign to Property (optional)</Label>
                <Select value={String(drivePropertyId)} onValueChange={(v) => setDrivePropertyId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                data-testid="button-submit-drive"
                className="w-full text-primary-foreground"
                onClick={handleImportDrive}
                disabled={importDrive.isPending}
              >
                {importDrive.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Import Images
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-images" className="rounded-xl shrink-0 text-primary-foreground">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Upload Images</DialogTitle>
            </DialogHeader>
            <ImageUploadZone
              properties={properties}
              onComplete={() => setUploadDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-image" variant="outline" className="rounded-xl shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Add URL
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Add Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  data-testid="input-image-url"
                  value={newImage.imageUrl}
                  onChange={(e) => setNewImage(d => ({ ...d, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  data-testid="input-image-title"
                  value={newImage.title}
                  onChange={(e) => setNewImage(d => ({ ...d, title: e.target.value }))}
                  placeholder="e.g. Master Bedroom View"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  data-testid="input-image-tags"
                  value={newImage.tags}
                  onChange={(e) => setNewImage(d => ({ ...d, tags: e.target.value }))}
                  placeholder="e.g. bedroom, luxury, interior"
                />
              </div>
              <div className="space-y-2">
                <Label>Property (optional)</Label>
                <Select value={String(newImage.propertyId)} onValueChange={(v) => setNewImage(d => ({ ...d, propertyId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                data-testid="button-submit-image"
                className="w-full text-primary-foreground"
                onClick={handleAddImage}
                disabled={createImage.isPending}
              >
                {createImage.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add to Gallery
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
