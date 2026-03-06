import { useState } from "react";
import { useProperties, useCreateProperty, useDeleteProperty } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Plus, MoreHorizontal, Home, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: properties, isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const deleteProperty = useDeleteProperty();
  const { toast } = useToast();

  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    nightlyRate: 0,
    status: "active",
    occupancyRate: 0,
    monthlyRevenue: 0,
    imageUrl: "/property-1.jpg",
  });

  const filteredProperties = (properties || []).filter(property => 
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProperty = () => {
    if (!newProperty.name || !newProperty.address) {
      toast({ title: "Please fill in property name and address", variant: "destructive" });
      return;
    }
    createProperty.mutate(newProperty, {
      onSuccess: () => {
        toast({ title: "Property created successfully" });
        setDialogOpen(false);
        setNewProperty({ name: "", address: "", nightlyRate: 0, status: "active", occupancyRate: 0, monthlyRevenue: 0, imageUrl: "/property-1.jpg" });
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
                    placeholder="e.g. Royal Heritage Haveli"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    data-testid="input-property-address"
                    value={newProperty.address}
                    onChange={(e) => setNewProperty(p => ({ ...p, address: e.target.value }))}
                    placeholder="e.g. C-Scheme, Jaipur, RJ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nightly Rate (₹)</Label>
                  <Input
                    data-testid="input-property-rate"
                    type="number"
                    value={newProperty.nightlyRate || ""}
                    onChange={(e) => setNewProperty(p => ({ ...p, nightlyRate: Number(e.target.value) }))}
                    placeholder="e.g. 500"
                  />
                </div>
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
        {filteredProperties.map((property) => (
          <Card key={property.id} data-testid={`card-property-${property.id}`} className="overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all group border-border">
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
            </div>
            
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors font-serif">{property.name}</h3>
                  <div className="flex items-center text-muted-foreground mt-1 text-sm">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    <span className="truncate">{property.address}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem>Edit Property</DropdownMenuItem>
                    <DropdownMenuItem>Manage Calendar</DropdownMenuItem>
                    <DropdownMenuItem>View Analytics</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      Delete Listing
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nightly Rate</p>
                  <p className="font-semibold text-lg mt-1">₹{property.nightlyRate}</p>
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

      {filteredProperties.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border/50">
          <Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No properties found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or add a new property.</p>
        </div>
      )}
    </div>
  );
}
