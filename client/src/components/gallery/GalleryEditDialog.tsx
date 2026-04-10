import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateGalleryImage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

interface Property {
  id: number;
  name: string;
}

interface GalleryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageId: number | null;
  editData: { title: string; tags: string; starRating: number; propertyId: number };
  setEditData: React.Dispatch<React.SetStateAction<{ title: string; tags: string; starRating: number; propertyId: number }>>;
  properties: Property[];
}

export function GalleryEditDialog({ open, onOpenChange, imageId, editData, setEditData, properties }: GalleryEditDialogProps) {
  const { toast } = useToast();
  const updateImage = useUpdateGalleryImage();

  const handleSave = () => {
    if (!imageId) return;
    const tags = editData.tags ? editData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    updateImage.mutate(
      {
        id: imageId,
        title: editData.title || null,
        tags,
        starRating: editData.starRating,
        propertyId: editData.propertyId || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Image updated" });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary">Edit Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={editData.title}
              onChange={(e) => setEditData(d => ({ ...d, title: e.target.value }))}
              placeholder="Image title"
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input
              value={editData.tags}
              onChange={(e) => setEditData(d => ({ ...d, tags: e.target.value }))}
              placeholder="bedroom, luxury, interior"
            />
          </div>
          <div className="space-y-2">
            <Label>Star Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  className={`h-6 w-6 cursor-pointer transition-colors ${
                    n <= editData.starRating ? "fill-primary text-primary" : "text-muted-foreground/20 hover:text-primary/50"
                  }`}
                  onClick={() => setEditData(d => ({ ...d, starRating: n === d.starRating ? 0 : n }))}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={String(editData.propertyId)} onValueChange={(v) => setEditData(d => ({ ...d, propertyId: Number(v) }))}>
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
            className="w-full text-primary-foreground"
            onClick={handleSave}
            disabled={updateImage.isPending}
          >
            {updateImage.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
