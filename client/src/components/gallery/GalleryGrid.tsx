import type { GalleryImage } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Pencil, Trash2, ImageIcon } from "lucide-react";
import { isVideoUrl } from "@/lib/media";



interface GalleryGridProps {
  images: GalleryImage[];
  onOpenDetail: (img: GalleryImage) => void;
  onOpenEdit: (img: GalleryImage) => void;
  onDelete: (id: number) => void;
  onStarClick: (imageId: number, rating: number) => void;
  getPropertyName: (propertyId: number | null) => string | null;
}

export function GalleryGrid({ images, onOpenDetail, onOpenEdit, onDelete, onStarClick, getPropertyName }: GalleryGridProps) {
  if (images.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border border-dashed border-border/50">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No media yet</h3>
        <p className="text-muted-foreground mt-2">Add images or videos manually, or import from Google Drive.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((img) => (
        <Card
          key={img.id}
          data-testid={`card-gallery-${img.id}`}
          className="overflow-hidden rounded-2xl border-border/50 group cursor-pointer hover:shadow-lg transition-all"
          onClick={() => onOpenDetail(img)}
        >
          <div className="relative aspect-square overflow-hidden bg-muted">
            {isVideoUrl(img.imageUrl) ? (
              <video
                src={img.imageUrl}
                aria-label={img.title || "Gallery video"}
                muted
                playsInline
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <img
                src={img.imageUrl}
                alt={img.title || "Gallery image"}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/property-1.jpg";
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-black/40 text-white hover:bg-black/60"
                aria-label={`Edit ${img.title || "gallery item"}`}
                onClick={(e) => { e.stopPropagation(); onOpenEdit(img); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-black/40 text-white hover:bg-red-500/80"
                aria-label={`Delete ${img.title || "gallery item"}`}
                onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {img.starRating && img.starRating > 0 && (
              <div className="absolute top-2 left-2">
                <div className="flex gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                  {Array.from({ length: img.starRating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <CardContent className="p-3">
            {img.title && (
              <h3 className="font-medium text-sm truncate">{img.title}</h3>
            )}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {(img.tags || []).slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 rounded-full">
                  {tag}
                </Badge>
              ))}
              {(img.tags || []).length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{(img.tags || []).length - 3}</span>
              )}
            </div>
            {img.propertyId && (
              <div className="text-[11px] text-muted-foreground mt-1 truncate">
                {getPropertyName(img.propertyId)}
              </div>
            )}

            <div className="flex gap-0.5 mt-2" onClick={(e) => e.stopPropagation()}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  className={`h-3.5 w-3.5 cursor-pointer transition-colors ${
                    n <= (img.starRating || 0) ? "fill-primary text-primary" : "text-muted-foreground/20 hover:text-primary/50"
                  }`}
                  onClick={() => onStarClick(img.id, n === img.starRating ? 0 : n)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
