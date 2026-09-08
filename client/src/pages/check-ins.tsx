import { businessToday } from "@shared/booking-rules";
import { useMemo } from "react";
import { useCheckIns, useProperties, useUpdateBooking } from "@/lib/api";
import { format, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LogOut, Clock, AlertTriangle, StickyNote, Building2, Moon, IndianRupee } from "lucide-react";
import { formatCurrency } from "@shared/currency";
import { useToast } from "@/hooks/use-toast";
import type { Booking } from "@shared/schema";

export default function CheckIns() {
  const { data: checkInData, isLoading } = useCheckIns();
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const updateBooking = useUpdateBooking();
  const { toast } = useToast();

  const propertiesMap = useMemo(() => {
    const map: Record<number, { name: string; checkInTime: string; checkOutTime: string; currency: string }> = {};
    const properties = propertiesResult?.data || [];
    if (properties) {
      properties.forEach(p => { map[p.id] = { name: p.name, checkInTime: p.checkInTime || "14:00", checkOutTime: p.checkOutTime || "11:00", currency: p.currency || "INR" }; });
    }
    return map;
  }, [propertiesResult]);

  const handleStatusChange = (bookingId: number, newStatus: string) => {
    if (!window.confirm(newStatus === "checked_out" ? "Confirm this guest has checked out?" : newStatus === "checked_in" ? "Confirm this guest has arrived?" : "Undo this status change?")) return;
    updateBooking.mutate({ id: bookingId, status: newStatus }, {
      onError: (error) => toast({ title: "Could not change booking", description: error.message, variant: "destructive" }),
      onSuccess: () => {
        toast({ title: `Booking marked as ${newStatus.replace("_", " ")}` });
      },
    });
  };

  const isOverdueArrival = (booking: Booking) => {
    const checkInDate = startOfDay(parseISO(booking.checkIn));
    return isBefore(checkInDate, startOfDay(new Date())) && booking.status === "upcoming";
  };

  const isOverdueDeparture = (booking: Booking) => {
    const checkOutDate = startOfDay(parseISO(booking.checkOut));
    return isBefore(checkOutDate, startOfDay(new Date())) && ["current", "checked_in"].includes(booking.status);
  };

  const getNights = (checkIn: string, checkOut: string) => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.ceil(diff / 86400000));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-primary/10 text-primary border-primary/20";
      case "current": return "bg-secondary/10 text-secondary border-secondary/20";
      case "checked_in": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "checked_out": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { arrivals = [], departures = [], todayArrivals = 0, todayDepartures = 0 } = checkInData || {};

  const renderBookingCard = (booking: Booking, type: "arrival" | "departure") => {
    const isOverdue = type === "arrival" ? isOverdueArrival(booking) : isOverdueDeparture(booking);
    const dateField = type === "arrival" ? booking.checkIn : booking.checkOut;
    const isDateToday = isToday(parseISO(dateField));
    const nights = getNights(booking.checkIn, booking.checkOut);
    const prop = propertiesMap[booking.propertyId];
    const timeStr = type === "arrival" ? (prop?.checkInTime || "14:00") : (prop?.checkOutTime || "11:00");

    return (
      <div
        key={`${type}-${booking.id}`}
        data-testid={`card-${type}-${booking.id}`}
        className={`p-4 rounded-xl border transition-all ${
          isOverdue
            ? "border-destructive/40 bg-destructive/5"
            : isDateToday
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {booking.guestName.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <h3 data-testid={`text-guest-${booking.id}`} className="font-semibold text-foreground truncate">{booking.guestName}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 size={12} />
                  <span className="truncate">{prop?.name || "Unknown"}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock size={12} />
                <span>{format(parseISO(dateField), "MMM d, yyyy")} at {timeStr}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Moon size={12} />
                <span>{nights} night{nights !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <IndianRupee size={12} />
                <span>{formatCurrency(booking.totalAmount, propertiesMap[booking.propertyId]?.currency)}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wider w-fit ${getStatusBadge(booking.status)}`}>
                {booking.status.replace("_", " ")}
              </Badge>
            </div>

            {booking.notes && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                <StickyNote size={12} className="shrink-0 mt-0.5 text-amber-400" />
                <span data-testid={`text-notes-${booking.id}`}><strong>Internal note: </strong>{booking.notes}</span>
              </div>
            )}

            {isOverdue && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle size={12} />
                <span>{type === "arrival" ? "Overdue check-in" : "Late check-out"}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            {type === "departure" && booking.status === "upcoming" && <span className="text-xs text-muted-foreground">Not checked in</span>}
            {type === "departure" && booking.status === "checked_out" && <Button variant="outline" size="sm" disabled={updateBooking.isPending} onClick={() => handleStatusChange(booking.id, "checked_in")}>Undo checkout</Button>}
            {type === "arrival" && ["checked_in", "current"].includes(booking.status) && <Button variant="outline" size="sm" disabled={updateBooking.isPending} onClick={() => handleStatusChange(booking.id, "upcoming")}>Undo check-in</Button>}
            {type === "arrival" && booking.status === "upcoming" && (
              <Button
                data-testid={`button-check-in-${booking.id}`}
                size="sm"
                className="text-xs text-primary-foreground min-h-[44px]"
                onClick={() => handleStatusChange(booking.id, "checked_in")}
                disabled={updateBooking.isPending || (type === "arrival" && booking.checkIn > businessToday())}
              >
                {updateBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogIn size={14} className="mr-1" />}
                Check In
              </Button>
            )}
            {type === "arrival" && booking.status === "checked_in" && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                Checked In
              </Badge>
            )}
            {type === "departure" && ["checked_in", "current"].includes(booking.status) && (
              <Button
                data-testid={`button-check-out-${booking.id}`}
                size="sm"
                variant="outline"
                className="text-xs min-h-[44px]"
                onClick={() => handleStatusChange(booking.id, "checked_out")}
                disabled={updateBooking.isPending}
              >
                {updateBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogOut size={14} className="mr-1" />}
                Check Out
              </Button>
            )}
            {type === "departure" && booking.status === "checked_out" && (
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                Checked Out
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 data-testid="text-checkins-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Check-ins</h1>
        <p className="text-muted-foreground mt-1">Manage today's and upcoming arrivals & departures.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <LogIn className="text-primary" size={22} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Arrivals</p>
              <p data-testid="text-today-arrivals" className="text-2xl font-bold text-foreground">{todayArrivals}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <LogOut className="text-amber-400" size={22} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Departures</p>
              <p data-testid="text-today-departures" className="text-2xl font-bold text-foreground">{todayDepartures}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="border-b border-border bg-secondary/20 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 font-serif text-primary">
            <LogIn size={20} />
            Arrivals
            <Badge data-testid="badge-arrivals-count" className="ml-auto bg-primary/15 text-primary text-xs">{arrivals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {arrivals.length > 0 ? (
            arrivals.map(b => renderBookingCard(b, "arrival"))
          ) : (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No upcoming arrivals in the next 7 days.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="border-b border-border bg-secondary/20 rounded-t-2xl">
          <CardTitle className="flex items-center gap-2 font-serif text-primary">
            <LogOut size={20} />
            Departures
            <Badge data-testid="badge-departures-count" className="ml-auto bg-amber-500/15 text-amber-400 text-xs">{departures.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {departures.length > 0 ? (
            departures.map(b => renderBookingCard(b, "departure"))
          ) : (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No upcoming departures in the next 7 days.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}