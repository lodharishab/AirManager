import { useState, useEffect, useMemo, useRef } from "react";
import { useBookings, useProperties, useCreateBooking, useRoomsByProperty, useAllRooms, useGuests, useCreateGuest } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar as CalendarIcon, Download, Plus, Loader2, FileText } from "lucide-react";
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
import { formatCurrency, getCurrencySymbol } from "@shared/currency";

const PAGE_SIZE = 20;

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const { data: bookingsResult, isLoading: bookingsLoading } = useBookings({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const createBooking = useCreateBooking();

  const [newBooking, setNewBooking] = useState({
    propertyId: 0,
    guestName: "",
    guestId: null as number | null,
    checkIn: "",
    checkOut: "",
    status: "upcoming",
    totalAmount: 0,
    roomId: null as number | null,
    roomCount: null as number | null,
    notes: "",
  });

  const [guestSearch, setGuestSearch] = useState("");
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const guestInputRef = useRef<HTMLDivElement>(null);

  const { data: guestResults } = useGuests({
    page: 1,
    limit: 10,
    search: guestSearch || undefined,
  });
  const createGuest = useCreateGuest();
  const guestSuggestions = guestResults?.data || [];

  const allProperties = propertiesResult?.data || [];
  const selectedProperty = allProperties.find(p => p.id === newBooking.propertyId);
  const isRoomBased = selectedProperty?.bookingMode === "room_based";
  const { data: propertyRooms } = useRoomsByProperty(isRoomBased ? newBooking.propertyId : undefined);

  const selectedRoom = useMemo(() => {
    if (!newBooking.roomId || !propertyRooms) return null;
    return propertyRooms.find(r => r.id === newBooking.roomId) || null;
  }, [newBooking.roomId, propertyRooms]);

  useEffect(() => {
    if (selectedRoom && newBooking.checkIn && newBooking.checkOut && newBooking.roomCount) {
      const checkIn = new Date(newBooking.checkIn);
      const checkOut = new Date(newBooking.checkOut);
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
      setNewBooking(b => ({ ...b, totalAmount: selectedRoom.nightlyRate * newBooking.roomCount! * nights }));
    }
  }, [selectedRoom, newBooking.checkIn, newBooking.checkOut, newBooking.roomCount]);

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const queryString = params.toString();
      const url = `/api/export/bookings${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: "Bookings exported successfully" });
    } catch {
      toast({ title: "Failed to export bookings", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const bookings = bookingsResult?.data || [];
  const totalBookings = bookingsResult?.total || 0;
  const totalPages = Math.ceil(totalBookings / PAGE_SIZE);

  const { data: allRoomsData } = useAllRooms();
  const roomsMap = useMemo(() => {
    const map: Record<number, { roomType: string; nightlyRate: number }> = {};
    if (allRoomsData) {
      allRoomsData.forEach(r => { map[r.id] = { roomType: r.roomType, nightlyRate: r.nightlyRate }; });
    }
    return map;
  }, [allRoomsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'upcoming': return 'bg-primary/10 text-primary border-primary/20';
      case 'checked_in': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'checked_out': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed': return 'bg-muted text-muted-foreground border-border';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCreateBooking = async () => {
    if (!newBooking.guestName || !newBooking.propertyId || !newBooking.checkIn || !newBooking.checkOut) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (isRoomBased && (!newBooking.roomId || !newBooking.roomCount)) {
      toast({ title: "Please select a room type and number of rooms", variant: "destructive" });
      return;
    }

    let guestId = newBooking.guestId;
    if (!guestId) {
      try {
        const newGuestData = await createGuest.mutateAsync({ name: newBooking.guestName });
        guestId = newGuestData.id;
      } catch {
        // continue without guest link
      }
    }

    const bookingData = {
      propertyId: newBooking.propertyId,
      guestName: newBooking.guestName,
      guestId,
      checkIn: new Date(newBooking.checkIn).toISOString(),
      checkOut: new Date(newBooking.checkOut).toISOString(),
      status: newBooking.status,
      totalAmount: newBooking.totalAmount,
      roomId: isRoomBased ? newBooking.roomId : null,
      roomCount: isRoomBased ? newBooking.roomCount : null,
      notes: newBooking.notes || null,
    };
    createBooking.mutate(bookingData, {
      onSuccess: () => {
        toast({ title: "Booking created successfully" });
        setDialogOpen(false);
        setNewBooking({ propertyId: 0, guestName: "", guestId: null, checkIn: "", checkOut: "", status: "upcoming", totalAmount: 0, roomId: null, roomCount: null, notes: "" });
        setGuestSearch("");
      },
    });
  };

  if (bookingsLoading) {
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
          <h1 data-testid="text-bookings-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Reservations</h1>
          <p className="text-muted-foreground mt-1">Manage your upcoming and past bookings.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            data-testid="button-export-bookings"
            variant="outline"
            className="rounded-xl shadow-sm"
            onClick={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-booking" className="rounded-xl shadow-sm text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-serif text-primary">Create New Booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2" ref={guestInputRef}>
                  <Label>Guest Name</Label>
                  <div className="relative">
                    <Input
                      data-testid="input-guest-name"
                      value={newBooking.guestName}
                      onChange={(e) => {
                        setNewBooking(b => ({ ...b, guestName: e.target.value, guestId: null }));
                        setGuestSearch(e.target.value);
                        setShowGuestSuggestions(true);
                      }}
                      onFocus={() => {
                        if (newBooking.guestName) setShowGuestSuggestions(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowGuestSuggestions(false), 200);
                      }}
                      placeholder="e.g. Jane Smith"
                    />
                    {showGuestSuggestions && guestSuggestions.length > 0 && newBooking.guestName && !newBooking.guestId && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {guestSuggestions.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            data-testid={`suggestion-guest-${g.id}`}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setNewBooking(b => ({ ...b, guestName: g.name, guestId: g.id }));
                              setShowGuestSuggestions(false);
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {g.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-medium">{g.name}</span>
                              {g.email && <span className="text-muted-foreground ml-1 text-xs">({g.email})</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {newBooking.guestId && (
                    <p className="text-xs text-muted-foreground">Linked to existing guest profile</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={newBooking.propertyId ? String(newBooking.propertyId) : ""}
                    onValueChange={(val) => setNewBooking(b => ({ ...b, propertyId: Number(val), roomId: null, roomCount: null }))}
                  >
                    <SelectTrigger data-testid="select-property">
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProperties.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isRoomBased && propertyRooms && propertyRooms.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Room Type</Label>
                      <Select
                        value={newBooking.roomId ? String(newBooking.roomId) : ""}
                        onValueChange={(val) => setNewBooking(b => ({ ...b, roomId: Number(val), roomCount: b.roomCount || 1 }))}
                      >
                        <SelectTrigger data-testid="select-room-type">
                          <SelectValue placeholder="Select a room type" />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyRooms.map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.roomType} — {formatCurrency(r.nightlyRate, selectedProperty?.currency)}/night ({r.roomCount} available)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Rooms</Label>
                      <Input
                        data-testid="input-booking-room-count"
                        type="number"
                        min={1}
                        max={selectedRoom?.roomCount || 1}
                        value={newBooking.roomCount || 1}
                        onChange={(e) => setNewBooking(b => ({ ...b, roomCount: Number(e.target.value) }))}
                      />
                    </div>
                  </>
                )}
                {isRoomBased && (!propertyRooms || propertyRooms.length === 0) && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600">
                    No room types configured for this property. Add room types in the property detail page first.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check In</Label>
                    <Input
                      data-testid="input-check-in"
                      type="date"
                      value={newBooking.checkIn}
                      onChange={(e) => setNewBooking(b => ({ ...b, checkIn: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Check Out</Label>
                    <Input
                      data-testid="input-check-out"
                      type="date"
                      value={newBooking.checkOut}
                      onChange={(e) => setNewBooking(b => ({ ...b, checkOut: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Total Amount ({getCurrencySymbol(selectedProperty?.currency)}){isRoomBased && selectedRoom ? " (auto-calculated)" : ""}</Label>
                  <Input
                    data-testid="input-total-amount"
                    type="number"
                    value={newBooking.totalAmount || ""}
                    onChange={(e) => setNewBooking(b => ({ ...b, totalAmount: Number(e.target.value) }))}
                    placeholder="e.g. 5000"
                    readOnly={isRoomBased && !!selectedRoom}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <textarea
                    data-testid="input-booking-notes"
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newBooking.notes}
                    onChange={(e) => setNewBooking(b => ({ ...b, notes: e.target.value }))}
                    placeholder="Special requests, arrival time, etc."
                    rows={2}
                  />
                </div>
                <Button
                  data-testid="button-submit-booking"
                  className="w-full text-primary-foreground"
                  onClick={handleCreateBooking}
                  disabled={createBooking.isPending}
                >
                  {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Booking
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm rounded-2xl overflow-hidden border-border">
        <div className="p-4 border-b border-border bg-secondary/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              data-testid="input-search-bookings"
              placeholder="Search by guest name..." 
              className="pl-9 rounded-xl bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
            {['all', 'current', 'upcoming', 'checked_in', 'checked_out', 'completed', 'cancelled'].map(status => (
              <Button 
                key={status}
                data-testid={`button-filter-${status}`}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className={`rounded-full capitalize text-xs shrink-0 min-h-[44px] ${
                  statusFilter === status ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="hover:bg-transparent border-b-border">
                <TableHead className="w-[200px]">Guest</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length > 0 ? (
                bookings.map((booking) => {
                  const property = allProperties.find(p => p.id === booking.propertyId);
                  return (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`} className="hover:bg-muted/30 transition-colors cursor-pointer border-b-border/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {booking.guestName.split(' ').map(n => n[0]).join('')}
                          </div>
                          {booking.guestName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {property?.name}
                        {property?.bookingMode === "room_based" && (
                          <Badge className="ml-2 bg-violet-500/15 text-violet-400 text-[9px] px-1.5 py-0 uppercase">Room</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.roomId && roomsMap[booking.roomId]
                          ? roomsMap[booking.roomId].roomType
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {booking.roomCount ? booking.roomCount : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{format(parseISO(booking.checkIn), "MMM d, yyyy")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{format(parseISO(booking.checkOut), "MMM d, yyyy")}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`uppercase tracking-wider text-[10px] ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(booking.totalAmount, property?.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <a href={`/invoice/${booking.id}`} target="_blank" rel="noopener noreferrer">
                          <Button
                            data-testid={`button-invoice-${booking.id}`}
                            variant="ghost"
                            size="sm"
                            className="rounded-lg min-h-[44px] px-2 text-muted-foreground hover:text-primary"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Invoice
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No reservations found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {bookings.length > 0 ? (
            bookings.map((booking) => {
              const property = allProperties.find(p => p.id === booking.propertyId);
              return (
                <div key={booking.id} data-testid={`card-booking-mobile-${booking.id}`} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {booking.guestName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{booking.guestName}</p>
                        <p className="text-xs text-muted-foreground">{property?.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`uppercase tracking-wider text-[10px] ${getStatusColor(booking.status)}`}>
                      {booking.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Check In</p>
                      <p className="font-medium">{format(parseISO(booking.checkIn), "MMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Check Out</p>
                      <p className="font-medium">{format(parseISO(booking.checkOut), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{formatCurrency(booking.totalAmount, property?.currency)}</p>
                    <a href={`/invoice/${booking.id}`} target="_blank" rel="noopener noreferrer">
                      <Button
                        data-testid={`button-invoice-mobile-${booking.id}`}
                        variant="ghost"
                        size="sm"
                        className="rounded-lg h-9 px-3 text-muted-foreground hover:text-primary min-h-[44px]"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Invoice
                      </Button>
                    </a>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No reservations found matching your criteria.
            </div>
          )}
        </div>
        
        <div className="p-4 border-t text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-3">
          <span data-testid="text-bookings-count">
            Showing {bookings.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, totalBookings)} of {totalBookings} reservations
          </span>
          <div className="flex gap-1 items-center">
            <Button
              data-testid="button-prev-page"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="rounded-lg h-9 min-h-[44px]"
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-xs">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              data-testid="button-next-page"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="rounded-lg h-9 min-h-[44px]"
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
