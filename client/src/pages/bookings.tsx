import { useState } from "react";
import { useBookings, useProperties, useCreateBooking } from "@/lib/api";
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
import { Search, Calendar as CalendarIcon, Download, Plus, Loader2 } from "lucide-react";
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

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: properties } = useProperties();
  const createBooking = useCreateBooking();
  const { toast } = useToast();

  const [newBooking, setNewBooking] = useState({
    propertyId: 0,
    guestName: "",
    checkIn: "",
    checkOut: "",
    status: "upcoming",
    totalAmount: 0,
  });

  const allBookings = bookings || [];
  const allProperties = properties || [];

  const filteredBookings = allBookings.filter(booking => {
    const matchesSearch = booking.guestName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'upcoming': return 'bg-primary/10 text-primary border-primary/20';
      case 'completed': return 'bg-muted text-muted-foreground border-border';
      case 'cancelled': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCreateBooking = () => {
    if (!newBooking.guestName || !newBooking.propertyId || !newBooking.checkIn || !newBooking.checkOut) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createBooking.mutate({
      ...newBooking,
      checkIn: new Date(newBooking.checkIn).toISOString(),
      checkOut: new Date(newBooking.checkOut).toISOString(),
    }, {
      onSuccess: () => {
        toast({ title: "Booking created successfully" });
        setDialogOpen(false);
        setNewBooking({ propertyId: 0, guestName: "", checkIn: "", checkOut: "", status: "upcoming", totalAmount: 0 });
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
          <Button variant="outline" className="rounded-xl shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export
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
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input
                    data-testid="input-guest-name"
                    value={newBooking.guestName}
                    onChange={(e) => setNewBooking(b => ({ ...b, guestName: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={newBooking.propertyId ? String(newBooking.propertyId) : ""}
                    onValueChange={(val) => setNewBooking(b => ({ ...b, propertyId: Number(val) }))}
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
                <div className="grid grid-cols-2 gap-4">
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
                  <Label>Total Amount (₹)</Label>
                  <Input
                    data-testid="input-total-amount"
                    type="number"
                    value={newBooking.totalAmount || ""}
                    onChange={(e) => setNewBooking(b => ({ ...b, totalAmount: Number(e.target.value) }))}
                    placeholder="e.g. 5000"
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
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['all', 'current', 'upcoming', 'completed', 'cancelled'].map(status => (
              <Button 
                key={status}
                data-testid={`button-filter-${status}`}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className={`rounded-full capitalize text-xs ${
                  statusFilter === status ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="hover:bg-transparent border-b-border">
                <TableHead className="w-[200px]">Guest</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => {
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
                        ₹{booking.totalAmount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No reservations found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="p-4 border-t text-sm text-muted-foreground flex justify-between items-center">
          Showing {filteredBookings.length} of {allBookings.length} reservations
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled className="rounded-lg h-8">Previous</Button>
            <Button variant="outline" size="sm" disabled className="rounded-lg h-8">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
