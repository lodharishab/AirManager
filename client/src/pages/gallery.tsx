import { useState } from "react";
import {
  useGalleryImages,
  useCreateGalleryImage,
  useUpdateGalleryImage,
  useDeleteGalleryImage,
  useImportFromDrive,
  useProperties,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Star,
  Trash2,
  Pencil,
  ImageIcon,
  Loader2,
  X,
  Tag,
  Filter,
  HardDrive,
} from "lucide-react";

export default function Gallery() {
  const { data: images, isLoading } = useGalleryImages();
  const { data: properties } = useProperties();
  const createImage = useCreateGalleryImage();
  const updateImage = useUpdateGalleryImage();
  const deleteImage = useDeleteGalleryImage();
  const importDrive = useImportFromDrive();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [filterProperty, setFilterProperty] = useState<string>("all");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const [newImage, setNewImage] = useState({ imageUrl: "", title: "", tags: "", propertyId: 0 });
  const [driveUrl, setDriveUrl] = useState("");
  const [drivePropertyId, setDrivePropertyId] = useState(0);
  const [editData, setEditData] = useState({ title: "", tags: "", starRating: 0, propertyId: 0 });
  const [tagInput, setTagInput] = useState("");

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
        onError: (err: any) => {
          toast({ title: err.message || "Failed to import", variant: "destructive" });
        },
      }
    );
  };

  const handleStarClick = (imageId: number, rating: number) => {
    updateImage.mutate({ id: imageId, starRating: rating });
  };

  const openEdit = (img: any) => {
    setSelectedImage(img);
    setEditData({
      title: img.title || "",
      tags: (img.tags || []).join(", "),
      starRating: img.starRating || 0,
      propertyId: img.propertyId || 0,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedImage) return;
    const tags = editData.tags ? editData.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    updateImage.mutate(
      {
        id: selectedImage.id,
        title: editData.title || null,
        tags,
        starRating: editData.starRating,
        propertyId: editData.propertyId || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Image updated" });
          setEditDialogOpen(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteImage.mutate(id, {
      onSuccess: () => toast({ title: "Image removed from gallery" }),
    });
  };

  const handleAddTag = (imageId: number, currentTags: string[], newTag: string) => {
    if (!newTag.trim() || currentTags.includes(newTag.trim())) return;
    updateImage.mutate({ id: imageId, tags: [...currentTags, newTag.trim()] });
    setTagInput("");
  };

  const handleRemoveTag = (imageId: number, currentTags: string[], tagToRemove: string) => {
    updateImage.mutate({ id: imageId, tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const openDetail = (img: any) => {
    setSelectedImage(img);
    setDetailDialogOpen(true);
    setTagInput("");
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                      {(properties || []).map(p => (
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

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-image" className="rounded-xl shrink-0 text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Add Image
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
                      {(properties || []).map(p => (
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

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filters:
        </div>

        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-[160px] h-8 rounded-lg text-xs">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="none">Unassigned</SelectItem>
            {(properties || []).map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {allTags.slice(0, 10).map(tag => (
              <Badge
                key={tag}
                variant={filterTag === tag ? "default" : "outline"}
                className={`cursor-pointer text-xs px-2 py-0.5 rounded-full ${
                  filterTag === tag ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-0.5 ml-1">
          {[1, 2, 3, 4, 5].map(n => (
            <Star
              key={n}
              className={`h-4 w-4 cursor-pointer transition-colors ${
                filterStar && n <= filterStar ? "fill-primary text-primary" : "text-muted-foreground/30 hover:text-primary/50"
              }`}
              onClick={() => setFilterStar(filterStar === n ? null : n)}
            />
          ))}
        </div>

        {(filterTag || filterStar || filterProperty !== "all" || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setFilterTag(null); setFilterStar(null); setFilterProperty("all"); setSearchTerm(""); }}
          >
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredImages.length} image{filteredImages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((img) => (
            <Card
              key={img.id}
              data-testid={`card-gallery-${img.id}`}
              className="overflow-hidden rounded-2xl border-border/50 group cursor-pointer hover:shadow-lg transition-all"
              onClick={() => openDetail(img)}
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={img.imageUrl}
                  alt={img.title || "Gallery image"}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/property-1.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-black/40 text-white hover:bg-black/60"
                    onClick={(e) => { e.stopPropagation(); openEdit(img); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-black/40 text-white hover:bg-red-500/80"
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
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
                      onClick={() => handleStarClick(img.id, n === img.starRating ? 0 : n)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/50">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No images yet</h3>
          <p className="text-muted-foreground mt-2">Add images manually or import from Google Drive.</p>
        </div>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
          {selectedImage && (
            <div>
              <div className="relative aspect-video bg-muted">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.title || "Gallery image"}
                  className="object-contain w-full h-full"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/property-1.jpg"; }}
                />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-primary">
                      {selectedImage.title || "Untitled Image"}
                    </h2>
                    {selectedImage.propertyId && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {getPropertyName(selectedImage.propertyId)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        className={`h-5 w-5 cursor-pointer transition-colors ${
                          n <= (selectedImage.starRating || 0) ? "fill-primary text-primary" : "text-muted-foreground/20 hover:text-primary/50"
                        }`}
                        onClick={() => {
                          const newRating = n === selectedImage.starRating ? 0 : n;
                          handleStarClick(selectedImage.id, newRating);
                          setSelectedImage({ ...selectedImage, starRating: newRating });
                        }}
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
                    {(selectedImage.tags || []).map((tag: string) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs px-2 py-0.5 rounded-full group/tag"
                      >
                        {tag}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer opacity-0 group-hover/tag:opacity-100 transition-opacity"
                          onClick={() => {
                            handleRemoveTag(selectedImage.id, selectedImage.tags || [], tag);
                            setSelectedImage({
                              ...selectedImage,
                              tags: (selectedImage.tags || []).filter((t: string) => t !== tag),
                            });
                          }}
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
                            handleAddTag(selectedImage.id, selectedImage.tags || [], tagInput);
                            setSelectedImage({
                              ...selectedImage,
                              tags: [...(selectedImage.tags || []), tagInput.trim()],
                            });
                            setTagInput("");
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
                  <span>Source: {selectedImage.source === "google_drive" ? "Google Drive" : "Manual"}</span>
                  <span>•</span>
                  <span>Added: {new Date(selectedImage.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
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
                  {(properties || []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full text-primary-foreground"
              onClick={handleSaveEdit}
              disabled={updateImage.isPending}
            >
              {updateImage.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
