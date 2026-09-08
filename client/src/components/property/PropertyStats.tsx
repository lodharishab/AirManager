import { Card, CardContent } from "@/components/ui/card";
import { Bed, Bath, Users, Ruler, Clock, Calendar } from "lucide-react";

interface PropertyStatsProps {
  property: {
    bookingMode?: string;
    totalRooms?: number;
    bedrooms?: number | null;
    bathrooms?: number | null;
    maxGuests?: number | null;
    squareFeet?: number | null;
    checkInTime?: string | null;
    minimumStay?: number | null;
  };
}

export function PropertyStats({ property }: PropertyStatsProps) {
  const stats = [
    { icon: <Bed className="h-4 w-4" />, label: property.bookingMode === "room_based" ? "Rooms" : "Bedrooms", value: property.bookingMode === "room_based" ? property.totalRooms ?? "Unverified" : property.bedrooms ?? "Unverified" },
    { icon: <Bath className="h-4 w-4" />, label: "Bathrooms", value: property.bathrooms || 1 },
    { icon: <Users className="h-4 w-4" />, label: "Max Guests", value: property.maxGuests ?? "Unverified" },
    { icon: <Ruler className="h-4 w-4" />, label: "Area", value: property.squareFeet ? `${property.squareFeet.toLocaleString()} sq ft` : "—" },
    { icon: <Clock className="h-4 w-4" />, label: "Check-in", value: property.checkInTime || "14:00" },
    { icon: <Calendar className="h-4 w-4" />, label: "Min Stay", value: `${property.minimumStay || 1} night${(property.minimumStay || 1) > 1 ? "s" : ""}` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-xl border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">{stat.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              <div className="font-semibold text-sm">{stat.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
