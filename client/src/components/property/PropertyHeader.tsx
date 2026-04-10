import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Pencil, DoorOpen } from "lucide-react";

interface PropertyHeaderProps {
  property: {
    name: string;
    address: string;
    status: string;
    propertyType?: string | null;
    bookingMode?: string | null;
  };
  onEdit: () => void;
}

export function PropertyHeader({ property, onEdit }: PropertyHeaderProps) {
  const statusColor = property.status === "active"
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : property.status === "maintenance"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";

  const propertyTypeLabel = (property.propertyType || "apartment").charAt(0).toUpperCase() + (property.propertyType || "apartment").slice(1);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link href="/properties">
          <Button data-testid="button-back-properties" variant="ghost" size="icon" className="rounded-xl min-h-[44px] min-w-[44px] shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 data-testid="text-property-name" className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-primary truncate">
            {property.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center text-muted-foreground text-sm min-w-0">
              <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${statusColor} border text-xs uppercase tracking-wider`}>
                {property.status}
              </Badge>
              <Badge variant="outline" className="text-xs uppercase tracking-wider">
                {propertyTypeLabel}
              </Badge>
              {property.bookingMode === "room_based" && (
                <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/30 text-xs uppercase tracking-wider flex items-center gap-1">
                  <DoorOpen className="h-3 w-3" /> Room Based
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      <Button data-testid="button-edit-property" variant="outline" className="rounded-xl min-h-[44px] self-start sm:self-center shrink-0" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" /> Edit
      </Button>
    </div>
  );
}
