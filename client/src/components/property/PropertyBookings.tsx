import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { formatCurrency } from "@shared/currency";

interface Booking {
  id: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: string;
  source?: string;
}

interface PropertyBookingsProps {
  bookings: Booking[];
  currency?: string;
}

export function PropertyBookings({ bookings, currency = "USD" }: PropertyBookingsProps) {
  if (!bookings || bookings.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Bookings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bookings.map((booking) => {
            const isExternal = booking.source && booking.source !== "manual";
            const bookingStatus = isExternal
              ? "bg-orange-500/15 text-orange-400"
              : booking.status === "current"
              ? "bg-blue-500/15 text-blue-400"
              : booking.status === "upcoming"
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground";
            return (
              <div
                key={booking.id}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isExternal
                    ? "bg-orange-500/5 border-orange-500/20"
                    : "bg-muted/30 border-border/30"
                }`}
                data-testid={`row-booking-${booking.id}`}
              >
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {booking.guestName}
                    {isExternal && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400" data-testid={`badge-external-${booking.id}`}>
                        External
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(booking.checkIn).toLocaleDateString("en-US", { day: "numeric", month: "short" })} — {new Date(booking.checkOut).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isExternal && (
                    <span className="font-semibold text-sm flex items-center" data-testid={`text-amount-${booking.id}`}>{formatCurrency(booking.totalAmount, currency)}</span>
                  )}
                  <Badge className={`${bookingStatus} text-xs uppercase`} data-testid={`badge-status-${booking.id}`}>
                    {isExternal ? "blocked" : booking.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
