import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useProperty, useUpdateProperty, useReviewsByProperty } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home, ArrowLeft } from "lucide-react";
import {
  PropertyHeader,
  PropertyHero,
  PropertyStats,
  PropertyAbout,
  PropertyRooms,
  PropertyBookings,
  PropertyReviews,
  PropertyLinks,
  PropertyQuickStats,
  PropertyEditDialog,
  PropertyEnrichDialog,
  PropertyCalendarSync,
} from "@/components/property";

export default function PropertyDetail() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id ? Number(params.id) : undefined;
  const { data: property, isLoading } = useProperty(propertyId);
  const { data: propertyReviews = [] } = useReviewsByProperty(propertyId);
  const updateProperty = useUpdateProperty();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const openEditDialog = () => {
    if (!property) return;
    setEditData({
      name: property.name,
      address: property.address,
      nightlyRate: property.nightlyRate,
      currency: property.currency || "USD",
      description: property.description || "",
      propertyType: property.propertyType || "apartment",
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      maxGuests: property.maxGuests || 2,
      squareFeet: property.squareFeet || 0,
      checkInTime: property.checkInTime || "14:00",
      checkOutTime: property.checkOutTime || "11:00",
      minimumStay: property.minimumStay || 1,
      houseRules: property.houseRules || "",
      neighborhood: property.neighborhood || "",
      status: property.status,
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!property) return;
    updateProperty.mutate(
      { id: property.id, ...editData },
      {
        onSuccess: () => {
          toast({ title: "Property updated" });
          setEditDialogOpen(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-20">
        <Home className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Property not found</h3>
        <Link href="/properties">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PropertyHeader property={property} onEdit={openEditDialog} />
      <PropertyHero property={property} />
      <PropertyStats property={property} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PropertyAbout property={property} />

          {property.bookingMode === "room_based" && (
            <PropertyRooms
              propertyId={property.id}
              rooms={property.rooms || []}
              currency={property.currency}
            />
          )}

          <PropertyBookings bookings={property.bookings || []} currency={property.currency} />
          <PropertyReviews reviews={propertyReviews} />
        </div>

        <div className="space-y-6">
          <PropertyCalendarSync
            propertyId={property.id}
            icalToken={property.icalToken}
            externalCalendars={property.externalCalendars || []}
          />
          <PropertyLinks
            propertyId={property.id}
            links={property.links || []}
            onOpenEnrich={() => {
              setEnrichDialogOpen(true);
            }}
          />
          <PropertyQuickStats
            checkOutTime={property.checkOutTime || "11:00"}
            bookings={property.bookings || []}
          />
        </div>
      </div>

      <PropertyEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editData={editData}
        setEditData={setEditData}
        onSave={handleSaveEdit}
        isPending={updateProperty.isPending}
      />

      <PropertyEnrichDialog
        open={enrichDialogOpen}
        onOpenChange={setEnrichDialogOpen}
        property={property}
      />
    </div>
  );
}
