import { useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useProperty, useUpdateProperty, useCreatePropertyLink, useDeletePropertyLink } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Users,
  Ruler,
  Clock,
  Calendar,
  IndianRupee,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  Home,
  Wifi,
  Car,
  Waves,
  Dumbbell,
  Tv,
  UtensilsCrossed,
  Wind,
  Shield,
  Sparkles,
  Eye,
  BookOpen,
  Link2,
  Loader2,
  X,
  Wand2,
  Check,
  AlertCircle,
} from "lucide-react";

const LINK_TYPE_ICONS: Record<string, string> = {
  airbnb: "🏠",
  booking: "🅱️",
  maps: "📍",
  photos: "📸",
  ota: "🌐",
  tour: "🎥",
  cleaning: "🧹",
  maintenance: "🔧",
  insurance: "🛡️",
  other: "🔗",
};

const LINK_TYPE_OPTIONS = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking", label: "Booking.com" },
  { value: "maps", label: "Google Maps" },
  { value: "photos", label: "Photo Gallery" },
  { value: "ota", label: "OTA / Travel Site" },
  { value: "tour", label: "Virtual Tour" },
  { value: "cleaning", label: "Cleaning Service" },
  { value: "maintenance", label: "Maintenance" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi": <Wifi className="h-4 w-4" />,
  "AC": <Wind className="h-4 w-4" />,
  "Pool": <Waves className="h-4 w-4" />,
  "Gym": <Dumbbell className="h-4 w-4" />,
  "Parking": <Car className="h-4 w-4" />,
  "TV": <Tv className="h-4 w-4" />,
  "Kitchen": <UtensilsCrossed className="h-4 w-4" />,
  "Security": <Shield className="h-4 w-4" />,
};

const FIELD_LABELS: Record<string, string> = {
  name: "Property Name",
  description: "Description",
  propertyType: "Property Type",
  nightlyRate: "Nightly Rate (₹)",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  maxGuests: "Max Guests",
  squareFeet: "Area (sq ft)",
  amenities: "Amenities",
  checkInTime: "Check-in Time",
  checkOutTime: "Check-out Time",
  minimumStay: "Min Stay (nights)",
  houseRules: "House Rules",
  neighborhood: "Neighbourhood",
  address: "Address",
};

export default function PropertyDetail() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id ? Number(params.id) : undefined;
  const { data: property, isLoading } = useProperty(propertyId);
  const updateProperty = useUpdateProperty();
  const createLink = useCreatePropertyLink();
  const deleteLink = useDeletePropertyLink();
  const { toast } = useToast();

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState({ label: "", url: "", linkType: "other" });
  const [editData, setEditData] = useState<Record<string, any>>({});

  const [enrichDialogOpen, setEnrichDialogOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichStreamText, setEnrichStreamText] = useState("");
  const [enrichResult, setEnrichResult] = useState<Record<string, any> | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [applyingFields, setApplyingFields] = useState(false);

  const runAIEnrich = useCallback(async () => {
    if (!property) return;
    setEnriching(true);
    setEnrichStreamText("");
    setEnrichResult(null);
    setEnrichError(null);
    setSelectedFields(new Set());

    try {
      const response = await fetch(`/api/properties/${property.id}/ai-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const err = await response.json();
        setEnrichError(err.message || "Failed to start AI enrichment");
        setEnriching(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setEnrichError("No response stream available");
        setEnriching(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) {
              setEnrichError(parsed.error);
              setEnriching(false);
              return;
            }
            if (parsed.content) {
              accumulated += parsed.content;
              setEnrichStreamText(accumulated);
            }
            if (parsed.done) {
              const finalText = parsed.fullResponse || accumulated;
              try {
                const cleaned = finalText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
                const result = JSON.parse(cleaned);
                setEnrichResult(result);
                const extractedKeys = Object.keys(result).filter(k => k !== "summary" && FIELD_LABELS[k]);
                setSelectedFields(new Set(extractedKeys));
              } catch {
                setEnrichError("AI returned invalid data format. Please try again.");
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setEnrichError(err.message || "Connection error");
    } finally {
      setEnriching(false);
    }
  }, [property]);

  const handleApplyFields = () => {
    if (!property || !enrichResult || selectedFields.size === 0) return;
    setApplyingFields(true);

    const updateData: Record<string, any> = {};
    Array.from(selectedFields).forEach(field => {
      if (enrichResult[field] !== undefined) {
        updateData[field] = enrichResult[field];
      }
    });

    updateProperty.mutate(
      { id: property.id, ...updateData },
      {
        onSuccess: () => {
          toast({ title: "Property updated with AI-extracted data" });
          setEnrichDialogOpen(false);
          setApplyingFields(false);
          queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
        },
        onError: () => {
          toast({ title: "Failed to apply changes", variant: "destructive" });
          setApplyingFields(false);
        },
      }
    );
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const formatFieldValue = (key: string, value: any): string => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "number" && key === "nightlyRate") return `₹${value.toLocaleString("en-IN")}`;
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.length > 120) return value.slice(0, 120) + "…";
    return String(value);
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

  const handleAddLink = () => {
    if (!newLink.label || !newLink.url) {
      toast({ title: "Please fill in label and URL", variant: "destructive" });
      return;
    }
    createLink.mutate(
      { propertyId: property.id, ...newLink },
      {
        onSuccess: () => {
          toast({ title: "Link added successfully" });
          setLinkDialogOpen(false);
          setNewLink({ label: "", url: "", linkType: "other" });
        },
      }
    );
  };

  const handleDeleteLink = (linkId: number) => {
    deleteLink.mutate(
      { linkId, propertyId: property.id },
      { onSuccess: () => toast({ title: "Link removed" }) }
    );
  };

  const openEditDialog = () => {
    setEditData({
      name: property.name,
      address: property.address,
      nightlyRate: property.nightlyRate,
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

  const statusColor = property.status === "active"
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : property.status === "maintenance"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
    : "bg-red-500/15 text-red-400 border-red-500/30";

  const propertyTypeLabel = (property.propertyType || "apartment").charAt(0).toUpperCase() + (property.propertyType || "apartment").slice(1);

  const enrichableFields = enrichResult
    ? Object.entries(enrichResult).filter(([k]) => k !== "summary" && FIELD_LABELS[k])
    : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Link href="/properties">
          <Button data-testid="button-back-properties" variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 data-testid="text-property-name" className="text-3xl font-bold tracking-tight font-serif text-primary">
            {property.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center text-muted-foreground text-sm">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {property.address}
            </div>
            <Badge className={`${statusColor} border text-xs uppercase tracking-wider`}>
              {property.status}
            </Badge>
            <Badge variant="outline" className="text-xs uppercase tracking-wider">
              {propertyTypeLabel}
            </Badge>
          </div>
        </div>
        <Button data-testid="button-edit-property" variant="outline" className="rounded-xl" onClick={openEditDialog}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
        <img
          src={property.imageUrl || "/property-1.jpg"}
          alt={property.name}
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 flex gap-4">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
            <div className="text-xs text-white/60 uppercase tracking-wider">Nightly Rate</div>
            <div className="text-xl font-bold flex items-center"><IndianRupee className="h-4 w-4" />{property.nightlyRate.toLocaleString("en-IN")}</div>
          </div>
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
            <div className="text-xs text-white/60 uppercase tracking-wider">Occupancy</div>
            <div className="text-xl font-bold">{property.occupancyRate}%</div>
          </div>
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
            <div className="text-xs text-white/60 uppercase tracking-wider">Monthly Revenue</div>
            <div className="text-xl font-bold flex items-center"><IndianRupee className="h-4 w-4" />{property.monthlyRevenue.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: <Bed className="h-4 w-4" />, label: "Bedrooms", value: property.bedrooms || 1 },
          { icon: <Bath className="h-4 w-4" />, label: "Bathrooms", value: property.bathrooms || 1 },
          { icon: <Users className="h-4 w-4" />, label: "Max Guests", value: property.maxGuests || 2 },
          { icon: <Ruler className="h-4 w-4" />, label: "Area", value: property.squareFeet ? `${property.squareFeet.toLocaleString()} sq ft` : "—" },
          { icon: <Clock className="h-4 w-4" />, label: "Check-in", value: property.checkInTime || "14:00" },
          { icon: <Calendar className="h-4 w-4" />, label: "Min Stay", value: `${property.minimumStay || 1} night${(property.minimumStay || 1) > 1 ? "s" : ""}` },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-xl border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{stat.icon}</div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className="font-semibold text-sm">{stat.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {property.description && (
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> About This Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                {property.neighborhood && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="text-muted-foreground">Neighbourhood:</span>
                    <span className="font-medium">{property.neighborhood}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {property.amenities && property.amenities.length > 0 && (
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Amenities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/30">
                      <span className="text-primary">
                        {AMENITY_ICONS[amenity] || <Sparkles className="h-4 w-4" />}
                      </span>
                      <span className="text-sm font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {property.houseRules && (
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" /> House Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.houseRules}</p>
              </CardContent>
            </Card>
          )}

          {property.bookings && property.bookings.length > 0 && (
            <Card className="rounded-2xl border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {property.bookings.map((booking) => {
                    const bookingStatus = booking.status === "current"
                      ? "bg-blue-500/15 text-blue-400"
                      : booking.status === "upcoming"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground";
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                        <div>
                          <div className="font-medium text-sm">{booking.guestName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm flex items-center"><IndianRupee className="h-3 w-3" />{booking.totalAmount.toLocaleString("en-IN")}</span>
                          <Badge className={`${bookingStatus} text-xs uppercase`}>{booking.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Links & Resources
              </CardTitle>
              <div className="flex gap-2">
                {property.links && property.links.length > 0 && (
                  <Button
                    data-testid="button-ai-enrich"
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => {
                      setEnrichDialogOpen(true);
                      setEnrichResult(null);
                      setEnrichError(null);
                      setEnrichStreamText("");
                    }}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1" /> AI Enrich
                  </Button>
                )}
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-link" variant="outline" size="sm" className="rounded-lg h-8">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-primary">Add Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          data-testid="input-link-label"
                          value={newLink.label}
                          onChange={(e) => setNewLink(l => ({ ...l, label: e.target.value }))}
                          placeholder="e.g. Airbnb Listing"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          data-testid="input-link-url"
                          value={newLink.url}
                          onChange={(e) => setNewLink(l => ({ ...l, url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newLink.linkType} onValueChange={(v) => setNewLink(l => ({ ...l, linkType: v }))}>
                          <SelectTrigger data-testid="select-link-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LINK_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        data-testid="button-submit-link"
                        className="w-full text-primary-foreground"
                        onClick={handleAddLink}
                        disabled={createLink.isPending}
                      >
                        {createLink.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Add Link
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {property.links && property.links.length > 0 ? (
                <div className="space-y-2">
                  {property.links.map((link) => (
                    <div key={link.id} data-testid={`link-item-${link.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 group hover:border-primary/30 transition-colors">
                      <span className="text-lg">{LINK_TYPE_ICONS[link.linkType] || "🔗"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{link.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteLink(link.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Link2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  No links added yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" /> Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Check-out Time</span>
                <span className="font-medium text-sm">{property.checkOutTime || "11:00"}</span>
              </div>
              <Separator className="bg-border/30" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Bookings</span>
                <span className="font-medium text-sm">{property.bookings?.length || 0}</span>
              </div>
              <Separator className="bg-border/30" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active Guests</span>
                <span className="font-medium text-sm">
                  {property.bookings?.filter(b => b.status === "current").length || 0}
                </span>
              </div>
              <Separator className="bg-border/30" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Upcoming</span>
                <span className="font-medium text-sm">
                  {property.bookings?.filter(b => b.status === "upcoming").length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary">Edit Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Property Name</Label>
                <Input value={editData.name || ""} onChange={(e) => setEditData(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input value={editData.address || ""} onChange={(e) => setEditData(d => ({ ...d, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={editData.propertyType || "apartment"} onValueChange={(v) => setEditData(d => ({ ...d, propertyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="haveli">Haveli</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="bungalow">Bungalow</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editData.status || "active"} onValueChange={(v) => setEditData(d => ({ ...d, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nightly Rate (₹)</Label>
                <Input type="number" value={editData.nightlyRate || ""} onChange={(e) => setEditData(d => ({ ...d, nightlyRate: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Neighbourhood</Label>
                <Input value={editData.neighborhood || ""} onChange={(e) => setEditData(d => ({ ...d, neighborhood: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input type="number" value={editData.bedrooms || ""} onChange={(e) => setEditData(d => ({ ...d, bedrooms: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input type="number" value={editData.bathrooms || ""} onChange={(e) => setEditData(d => ({ ...d, bathrooms: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Guests</Label>
                <Input type="number" value={editData.maxGuests || ""} onChange={(e) => setEditData(d => ({ ...d, maxGuests: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Area (sq ft)</Label>
                <Input type="number" value={editData.squareFeet || ""} onChange={(e) => setEditData(d => ({ ...d, squareFeet: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Check-in Time</Label>
                <Input value={editData.checkInTime || ""} onChange={(e) => setEditData(d => ({ ...d, checkInTime: e.target.value }))} placeholder="14:00" />
              </div>
              <div className="space-y-2">
                <Label>Check-out Time</Label>
                <Input value={editData.checkOutTime || ""} onChange={(e) => setEditData(d => ({ ...d, checkOutTime: e.target.value }))} placeholder="11:00" />
              </div>
              <div className="space-y-2">
                <Label>Min Stay (nights)</Label>
                <Input type="number" value={editData.minimumStay || ""} onChange={(e) => setEditData(d => ({ ...d, minimumStay: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} value={editData.description || ""} onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>House Rules</Label>
              <Textarea rows={3} value={editData.houseRules || ""} onChange={(e) => setEditData(d => ({ ...d, houseRules: e.target.value }))} />
            </div>
            <Button
              data-testid="button-save-property"
              className="w-full text-primary-foreground"
              onClick={handleSaveEdit}
              disabled={updateProperty.isPending}
            >
              {updateProperty.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={enrichDialogOpen} onOpenChange={(open) => { if (!enriching) setEnrichDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary flex items-center gap-2">
              <Wand2 className="h-5 w-5" /> AI Property Enrichment
            </DialogTitle>
          </DialogHeader>

          {!enriching && !enrichResult && !enrichError && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI will fetch content from all <span className="text-primary font-medium">{property.links?.length || 0} saved links</span> and extract structured property details. You'll be able to review the extracted data before applying any changes.
                </p>
              </div>
              <div className="space-y-2">
                {property.links?.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                    <span>{LINK_TYPE_ICONS[link.linkType] || "🔗"}</span>
                    <span className="truncate flex-1">{link.label}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</span>
                  </div>
                ))}
              </div>
              <Button
                data-testid="button-start-enrich"
                className="w-full text-primary-foreground"
                onClick={runAIEnrich}
              >
                <Wand2 className="h-4 w-4 mr-2" /> Start AI Enrichment
              </Button>
            </div>
          )}

          {enriching && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Analyzing your links...</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fetching content and extracting property data with AI</p>
                </div>
              </div>
              {enrichStreamText && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/30 max-h-[200px] overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{enrichStreamText}</pre>
                </div>
              )}
            </div>
          )}

          {enrichError && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm">{enrichError}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setEnrichError(null); }}>
                Try Again
              </Button>
            </div>
          )}

          {enrichResult && !enriching && (
            <div className="space-y-4 pt-2">
              {enrichResult.summary && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground leading-relaxed">{enrichResult.summary}</p>
                </div>
              )}

              {enrichableFields.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Select fields to apply:</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedFields(new Set(enrichableFields.map(([k]) => k)))}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedFields(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {enrichableFields.map(([key, value]) => {
                      const currentValue = (property as any)[key];
                      const isNew = !currentValue || (Array.isArray(currentValue) && currentValue.length === 0);
                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                            selectedFields.has(key)
                              ? "bg-primary/5 border-primary/30"
                              : "bg-muted/20 border-border/30 hover:border-border/50"
                          }`}
                          onClick={() => toggleField(key)}
                        >
                          <Checkbox
                            checked={selectedFields.has(key)}
                            onCheckedChange={() => toggleField(key)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{FIELD_LABELS[key] || key}</span>
                              {isNew && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] px-1.5 py-0">NEW</Badge>
                              )}
                              {!isNew && (
                                <Badge className="bg-amber-500/15 text-amber-400 text-[10px] px-1.5 py-0">UPDATE</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 break-words">
                              {formatFieldValue(key, value)}
                            </p>
                            {!isNew && currentValue && (
                              <p className="text-[11px] text-muted-foreground/60 mt-1">
                                Current: {formatFieldValue(key, currentValue)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEnrichDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      data-testid="button-apply-enrich"
                      className="flex-1 text-primary-foreground"
                      onClick={handleApplyFields}
                      disabled={selectedFields.size === 0 || applyingFields}
                    >
                      {applyingFields ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Apply {selectedFields.size} Field{selectedFields.size !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No new property data could be extracted from the links.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
