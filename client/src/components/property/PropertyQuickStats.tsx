import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";

interface Booking {
  status: string;
}

interface PropertyQuickStatsProps {
  checkOutTime: string;
  bookings: Booking[];
}

export function PropertyQuickStats({ checkOutTime, bookings }: PropertyQuickStatsProps) {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
          <Eye className="h-4 w-4" /> Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Check-out Time</span>
          <span className="font-medium text-sm">{checkOutTime}</span>
        </div>
        <Separator className="bg-border/30" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Bookings</span>
          <span className="font-medium text-sm">{bookings.length}</span>
        </div>
        <Separator className="bg-border/30" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Checked-in Bookings</span>
          <span className="font-medium text-sm">
            {bookings.filter(b => ["current", "checked_in"].includes(b.status)).length}
          </span>
        </div>
        <Separator className="bg-border/30" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Upcoming</span>
          <span className="font-medium text-sm">
            {bookings.filter(b => b.status === "upcoming").length}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
