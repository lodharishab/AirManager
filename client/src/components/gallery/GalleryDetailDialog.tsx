import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { useUpdateGalleryImage } from "@/lib/api";
import { Star, Tag, X } from "lucide-react";

interface GalleryImage {
  id: number;
  imageUrl: string;
  title?: string | null;
  tags?: string[] | null;
  starRating?: number | null;
  propertyId?: number | null;
  source?: string | null;
  createdAt?: string | null;
}

interface GalleryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: GalleryImage | null;
  onImageUpdate: (image: GalleryImage) => void;
  getPropertyName: (propertyId: number | null) => string | null;
}

export function GalleryDetailDialog({ open, onOpenChange, image, onImageUpdate, getPropertyName }: GalleryDetailDialogProps) {
  const updateImage = useUpdateGalleryImage();
  const [tagInput, setTagInput] = useState("");

  if (!image) return null;

  const handleStarClick = (rating: number) => {
    const newRating = rating === image.starRating ? 0 : rating;
    updateImage.mutate({ id: image.id, starRating: newRating });
    onImageUpdate({ ...image, starRating: newRating });
  };

  const handleAddTag = (newTag: string) => {
    if (!newTag.trim() || (image.tags || []).includes(newTag.trim())) return;
    const newTags = [...(image.tags || []), newTag.trim()];
    updateImage.mutate({ id: image.id, tags: newTags });
    onImageUpdate({ ...image, tags: newTags });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = (image.tags || []).filter(t => t !== tagToRemove);
    updateImage.mutate({ id: image.id, tags: newTags });
    onImageUpdate({ ...image, tags: newTags });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
        <div>
          <div className="relative aspect-video bg-muted">
            <img
              src={image.imageUrl}
              alt={image.title || "Gallery image"}
              className="object-contain w-full h-full"
              onError={(e) => { (e.target as HTMLImageElement).src = "/property-1.jpg"; }}
            />
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-primary">
                  {image.title || "Untitled Image"}
                </h2>
                {image.propertyId && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {getPropertyName(image.propertyId)}
                  </p>
                )}
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    className={`h-5 w-5 cursor-pointer transition-colors ${
                      n <= (image.starRating || 0) ? "fill-primary text-primary" : "text-muted-foreground/20 hover:text-primary/50"
                    }`}
                    onClick={() => handleStarClick(n)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tags</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(image.tags || []).map((tag: string) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs px-2 py-0.5 rounded-full group/tag"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer opacity-0 group-hover/tag:opacity-100 transition-opacity"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    className="h-7 w-28 text-xs rounded-full px-2.5"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        handleAddTag(tagInput);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
              <span>Source: {image.source === "google_drive" ? "Google Drive" : "Manual"}</span>
              <span>•</span>
              <span>Added: {image.createdAt ? new Date(image.createdAt).toLocaleDateString("en-US") : "Unknown"}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
