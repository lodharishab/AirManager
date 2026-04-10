import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useProperties, useCreateProperty, useDeleteProperty } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Plus, MoreHorizontal, Home, Loader2, Bed, Bath, Users, DoorOpen } from "lucide-react";
import { formatCurrency, SUPPORTED_CURRENCIES } from "@shared/currency";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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

const PAGE_SIZE = 12;

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: result, isLoading } = useProperties({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const properties = result?.data || [];
  const totalProperties = result?.total || 0;
  const totalPages = Math.ceil(totalProperties / PAGE_SIZE);

  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    nightlyRate: 0,
    status: "active",
    occupancyRate: 0,
    monthlyRevenue: 0,
    imageUrl: "/property-1.jpg",
    bookingMode: "whole" as "whole" | "room_based",
    currency: "USD",
  });

  const handleCreateProperty = () => {
    if (!newProperty.name || !newProperty.address) {
      toast({ title: "Please fill in property name and address", variant: "destructive" });
      return;
    }
    if (newProperty.bookingMode === "whole" && !newProperty.nightlyRate) {
      toast({ title: "Please set the nightly rate", variant: "destructive" });
      return;
    }
    const payload = newProperty.bookingMode === "room_based"
      ? { ...newProperty, nightlyRate: 0 }
      : newProperty;
    createProperty.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Property created successfully" });
        setDialogOpen(false);
        setNewProperty({ name: "", address: "", nightlyRate: 0, status: "active", occupancyRate: 0, monthlyRevenue: 0, imageUrl: "/property-1.jpg", bookingMode: "whole", currency: "USD" });
      },
    });
  };

  const handleDeleteProperty = (id: number) => {
    deleteProperty.mutate(id, {
      onSuccess: () => {
        toast({ title: "Property deleted successfully" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 data-testid="text-properties-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your listings and view their performance.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              data-testid="input-search-properties"
              placeholder="Search properties..." 
              className="pl-9 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-property" className="rounded-xl shrink-0 shadow-sm text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-serif text-primary">Add New Property</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Property Name</Label>
                  <Input
                    data-testid="input-property-name"
                    value={newProperty.name}
                    onChange={(e) => setNewProperty(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Beachfront Villa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    data-testid="input-property-address"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty(p => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. 123 Ocean Drive, Miami, FL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Booking Mode</Label>
                  <Select
                    value={newProperty.bookingMode}
                    onValueChange={(val) => setNewProperty(p => ({ ...p, bookingMode: val as "whole" | "room_based" }))}
                  >
                    <SelectTrigger data-testid="select-booking-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whole">Whole Property</SelectItem>
                      <SelectItem value="room_based">Room Based</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newProperty.bookingMode === "room_based"
                      ? "Guests book individual room types. Set rates per room type after creating the property."
                      : "Guests book the entire property at a single nightly rate."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={newProperty.currency}
                    onValueChange={(val) => setNewProperty(p => ({ ...p, currency: val }))}
                  >
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newProperty.bookingMode === "whole" && (
                  <div className="space-y-2">
                    <Label>Nightly Rate ({SUPPORTED_CURRENCIES.find(c => c.code === newProperty.currency)?.symbol || "$"})</Label>
                    <Input
                      data-testid="input-property-rate"
                      type="number"
                      value={newProperty.nightlyRate || ""}
                      onChange={(e) => setNewProperty(p => ({ ...p, nightlyRate: Number(e.target.value) }))}
                      placeholder="e.g. 500"
                    />
                  </div>
                )}
                <Button
                  data-testid="button-submit-property"
                  className="w-full text-primary-foreground"
                  onClick={handleCreateProperty}
                  disabled={createProperty.isPending}
                >
                  {createProperty.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Property
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} data-testid={`card-property-${property.id}`} className="overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all group border-border">
            <Link href={`/properties/${property.id}`} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img 
                  src={property.imageUrl || "/property-1.jpg"} 
                  alt={property.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <Badge className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    property.status === 'active' 
                      ? 'bg-background/90 text-success hover:bg-background' 
                      : 'bg-background/90 text-accent hover:bg-background'
                  }`}>
                    {property.status}
                  </Badge>
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                  {property.propertyType && (
                    <Badge className="bg-background/90 text-foreground hover:bg-background px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                      {property.propertyType}
                    </Badge>
                  )}
                  {property.bookingMode === "room_based" && (
                    <Badge data-testid={`badge-room-based-${property.id}`} className="bg-violet-500/90 text-white hover:bg-violet-500 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                      <DoorOpen className="h-3 w-3" /> Room Based
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
            
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <Link href={`/properties/${property.id}`} className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors font-serif cursor-pointer">{property.name}</h3>
                  <div className="flex items-center text-muted-foreground mt-1 text-sm">
                    <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11 -mr-2 -mt-2 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem asChild>
                      <Link href={`/properties/${property.id}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      Delete Listing
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {(property.bedrooms || property.bathrooms || property.maxGuests) && (
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {property.bedrooms && (
                    <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{property.bedrooms} bed{property.bedrooms > 1 ? "s" : ""}</span>
                  )}
                  {property.bathrooms && (
                    <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms} bath</span>
                  )}
                  {property.maxGuests && (
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{property.maxGuests} guests</span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {property.bookingMode === "room_based" ? "Booking" : "Nightly Rate"}
                  </p>
                  <p className="font-semibold text-lg mt-1">
                    {property.bookingMode === "room_based" ? "Per Room" : formatCurrency(property.nightlyRate, property.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Occupancy</p>
                  <p className="font-semibold text-lg mt-1">{property.occupancyRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/50">
          <Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No properties found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or add a new property.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <Button
            data-testid="button-prev-properties"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            className="rounded-lg min-h-[44px]"
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            data-testid="button-next-properties"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            className="rounded-lg min-h-[44px]"
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
