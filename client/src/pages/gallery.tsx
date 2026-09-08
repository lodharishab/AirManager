import type { GalleryImage } from "@shared/schema";
import { useState } from "react";
import {
  useGalleryImages,
  useUpdateGalleryImage,
  useDeleteGalleryImage,
  useProperties,
} from "@/lib/api";
import { Loader2 } from "lucide-react";
import {
  GalleryHeader,
  GalleryFilters,
  GalleryGrid,
  GalleryDetailDialog,
  GalleryEditDialog,
} from "@/components/gallery";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Gallery() {
  const { data: imagesResult, isLoading } = useGalleryImages({ page: 1, limit: 10000 });
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const images = imagesResult?.data || [];
  const properties = propertiesResult?.data || [];
  const updateImage = useUpdateGalleryImage();
  const deleteImage = useDeleteGalleryImage();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>("all");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [editData, setEditData] = useState({ title: "", tags: "", starRating: 0, propertyId: 0 });

  const allTags = Array.from(
    new Set((images || []).flatMap(img => img.tags || []))
  ).sort();

  const filteredImages = (images || []).filter(img => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = img.title?.toLowerCase().includes(term);
      const matchTags = img.tags?.some(t => t.toLowerCase().includes(term));
      if (!matchTitle && !matchTags) return false;
    }
    if (filterTag && !(img.tags || []).includes(filterTag)) return false;
    if (filterStar && (img.starRating || 0) < filterStar) return false;
    if (filterProperty !== "all") {
      if (filterProperty === "none" && img.propertyId) return false;
      if (filterProperty !== "none" && img.propertyId !== Number(filterProperty)) return false;
    }
    return true;
  });

  const handleStarClick = (imageId: number, rating: number) => {
    updateImage.mutate({ id: imageId, starRating: rating });
  };

  const openEdit = (img: GalleryImage) => {
    setSelectedImage(img);
    setEditData({
      title: img.title || "",
      tags: (img.tags || []).join(", "),
      starRating: img.starRating || 0,
      propertyId: img.propertyId || 0,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId !== null) {
      deleteImage.mutate(deleteTargetId);
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  const openDetail = (img: GalleryImage) => {
    setSelectedImage(img);
    setDetailDialogOpen(true);
  };

  const getPropertyName = (propertyId: number | null) => {
    if (!propertyId || !properties) return null;
    return properties.find(p => p.id === propertyId)?.name || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <GalleryHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        properties={properties || []}
      />

      <GalleryFilters
        filterProperty={filterProperty}
        setFilterProperty={setFilterProperty}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
        filterStar={filterStar}
        setFilterStar={setFilterStar}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        allTags={allTags}
        properties={properties || []}
        filteredCount={filteredImages.length}
      />

      <GalleryGrid
        images={filteredImages}
        onOpenDetail={openDetail}
        onOpenEdit={openEdit}
        onDelete={handleDelete}
        onStarClick={handleStarClick}
        getPropertyName={getPropertyName}
      />

      <GalleryDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        image={selectedImage}
        onImageUpdate={setSelectedImage}
        getPropertyName={getPropertyName}
      />

      <GalleryEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        imageId={selectedImage?.id || null}
        editData={editData}
        setEditData={setEditData}
        properties={properties || []}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This will permanently remove it from both the gallery and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-delete" onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
