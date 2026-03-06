import { useState } from "react";
import { mockProperties } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Plus, MoreHorizontal, Star, Home } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProperties = mockProperties.filter(property => 
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your listings and view their performance.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search properties..." 
              className="pl-9 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="rounded-xl shrink-0 shadow-sm text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all group">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <img 
                src={property.image} 
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
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{property.name}</h3>
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
                    <DropdownMenuItem className="text-destructive">Deactivate Listing</DropdownMenuItem>
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