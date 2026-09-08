import { useState, useRef } from "react";
import { DoorOpen, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUploadImages, useUpdateProperty } from "@/lib/api";
import { formatCurrency } from "@shared/currency";

interface PropertyHeroProps {
  property: {
    id: number;
    name: string;
    imageUrl?: string | null;
    nightlyRate: number;
    occupancyRate: number;
    monthlyRevenue: number;
    bookingMode?: string | null;
    currency?: string;
  };
}

export function PropertyHero({ property }: PropertyHeroProps) {
  const currency = property.currency || "INR";
  const { toast } = useToast();
  const uploadImages = useUploadImages();
  const updateProperty = useUpdateProperty();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Only JPEG, PNG, and WebP images are accepted", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File size must be under 10MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadImages.mutateAsync([file]);
      if (result.uploaded.length > 0) {
        await updateProperty.mutateAsync({ id: property.id, imageUrl: result.uploaded[0].url });
        toast({ title: "Property image updated" });
      } else if (result.errors.length > 0) {
        toast({ title: result.errors[0].error, variant: "destructive" });
      }
    } catch (err: unknown) {
      toast({ title: (err instanceof Error ? err.message : String(err)) || "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-muted group">
      <img
        src={property.imageUrl || "/property-1.jpg"}
        alt={property.name}
        className="object-cover w-full h-full"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      <input
        ref={fileInputRef}
        type="file"
        data-testid="input-property-image-upload"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />
      <Button
        data-testid="button-upload-property-image"
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-9 w-9 bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>

      <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 flex flex-wrap gap-2 sm:gap-4">
        {property.bookingMode === "room_based" ? (
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-white">
            <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider">Booking</div>
            <div className="text-base sm:text-xl font-bold flex items-center gap-1"><DoorOpen className="h-3 w-3 sm:h-4 sm:w-4" /> Per Room</div>
          </div>
        ) : (
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-white">
            <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider">Nightly Rate</div>
            <div className="text-base sm:text-xl font-bold flex items-center">{formatCurrency(property.nightlyRate, currency)}</div>
          </div>
        )}
        <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-white">
          <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider">Occupancy</div>
          <div className="text-base sm:text-xl font-bold">{property.occupancyRate}%</div>
        </div>
        <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-white">
          <div className="text-[10px] sm:text-xs text-white/60 uppercase tracking-wider">Monthly Revenue</div>
          <div className="text-base sm:text-xl font-bold flex items-center">{formatCurrency(property.monthlyRevenue, currency)}</div>
        </div>
      </div>
    </div>
  );
}
