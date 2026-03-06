import { useState } from "react";
import { mockBookings, mockProperties } from "@/lib/mock-data";
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
import { Search, Filter, Calendar as CalendarIcon, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredBookings = mockBookings.filter(booking => {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
          <p className="text-muted-foreground mt-1">Manage your upcoming and past bookings.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl shadow-sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button className="rounded-xl shadow-sm text-primary-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" /> Calendar View
          </Button>
        </div>
      </div>

      <Card className="shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
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
            <TableHeader className="bg-muted/20">
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
                  const property = mockProperties.find(p => p.id === booking.propertyId);
                  return (
                    <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors cursor-pointer border-b-border/50">
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
                        ₹{booking.totalAmount}
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
          Showing {filteredBookings.length} of {mockBookings.length} reservations
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled className="rounded-lg h-8">Previous</Button>
            <Button variant="outline" size="sm" disabled className="rounded-lg h-8">Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}