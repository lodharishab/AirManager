import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGuest, useUpdateGuest, useDeleteGuest, useProperties } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Globe,
  Calendar,
  DollarSign,
  Star,
  Edit2,
  Trash2,
  Save,
  X,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@shared/currency";

export default function GuestDetail() {
  const [, params] = useRoute("/guests/:id");
  const [, setLocation] = useLocation();
  const guestId = params?.id ? Number(params.id) : undefined;
  const { data: guest, isLoading } = useGuest(guestId);
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const updateGuest = useUpdateGuest();
  const deleteGuest = useDeleteGuest();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    notes: "",
    tags: "",
  });

  const properties = propertiesResult?.data || [];
  const primaryCurrency = properties[0]?.currency || "USD";

  const startEditing = () => {
    if (!guest) return;
    setEditForm({
      name: guest.name,
      email: guest.email || "",
      phone: guest.phone || "",
      nationality: guest.nationality || "",
      notes: guest.notes || "",
      tags: (guest.tags || []).join(", "),
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!guestId || !editForm.name) return;
    const tags = editForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateGuest.mutate(
      {
        id: guestId,
        name: editForm.name,
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        nationality: editForm.nationality || undefined,
        notes: editForm.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Guest updated" });
          setEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!guestId) return;
    deleteGuest.mutate(guestId, {
      onSuccess: () => {
        toast({ title: "Guest deleted" });
        setLocation("/guests");
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

  if (!guest) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Users className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Guest not found.</p>
        <Button variant="outline" onClick={() => setLocation("/guests")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Guests
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button
          data-testid="button-back-guests"
          variant="ghost"
          size="sm"
          className="rounded-xl"
          onClick={() => setLocation("/guests")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl shadow-sm border-border">
            <CardHeader className="pb-4 border-b bg-secondary/30 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-serif text-primary">Profile</CardTitle>
              <div className="flex gap-1">
                {!editing ? (
                  <>
                    <Button
                      data-testid="button-edit-guest"
                      variant="ghost"
                      size="sm"
                      onClick={startEditing}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      data-testid="button-delete-guest"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      data-testid="button-save-guest"
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={updateGuest.isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      data-testid="input-edit-guest-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      data-testid="input-edit-guest-email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      data-testid="input-edit-guest-phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nationality</Label>
                    <Input
                      data-testid="input-edit-guest-nationality"
                      value={editForm.nationality}
                      onChange={(e) => setEditForm((f) => ({ ...f, nationality: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tags (comma separated)</Label>
                    <Input
                      data-testid="input-edit-guest-tags"
                      value={editForm.tags}
                      onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <textarea
                      data-testid="input-edit-guest-notes"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {guest.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h2 data-testid="text-guest-name" className="text-xl font-bold">
                        {guest.name}
                      </h2>
                      {guest.nationality && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {guest.nationality}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {guest.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-guest-email">{guest.email}</span>
                      </div>
                    )}
                    {guest.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-guest-phone">{guest.phone}</span>
                      </div>
                    )}
                  </div>

                  {guest.tags && guest.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {guest.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {guest.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                      <p data-testid="text-guest-notes" className="text-sm">
                        {guest.notes}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-border">
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <p data-testid="text-guest-total-stays" className="text-2xl font-bold">
                    {guest.totalStays}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Stays</p>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <p data-testid="text-guest-total-spent" className="text-2xl font-bold">
                    {formatCurrency(guest.totalSpent || 0, primaryCurrency)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <p data-testid="text-guest-last-visit" className="text-lg font-bold">
                    {guest.lastVisit
                      ? format(parseISO(guest.lastVisit), "MMM d")
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Visit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl shadow-sm border-border">
            <CardHeader className="pb-4 border-b bg-secondary/30">
              <CardTitle className="text-lg font-serif text-primary">Booking History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {guest.bookings && guest.bookings.length > 0 ? (
                <div className="divide-y">
                  {guest.bookings.map((booking) => {
                    const property = properties.find((p) => p.id === booking.propertyId);
                    return (
                      <div
                        key={booking.id}
                        data-testid={`card-guest-booking-${booking.id}`}
                        className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm">{property?.name || `Property #${booking.propertyId}`}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(parseISO(booking.checkIn), "MMM d, yyyy")} —{" "}
                            {format(parseISO(booking.checkOut), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(booking.totalAmount, property?.currency)}</p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-[10px] uppercase tracking-wider ${
                              booking.status === "current"
                                ? "bg-secondary/10 text-secondary border-secondary/20"
                                : booking.status === "upcoming"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : booking.status === "completed" || booking.status === "checked_out"
                                    ? "bg-muted text-muted-foreground"
                                    : booking.status === "cancelled"
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No bookings yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm border-border">
            <CardHeader className="pb-4 border-b bg-secondary/30">
              <CardTitle className="text-lg font-serif text-primary">Reviews</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {guest.reviews && guest.reviews.length > 0 ? (
                <div className="divide-y">
                  {guest.reviews.map((review) => {
                    const property = properties.find((p) => p.id === review.propertyId);
                    return (
                      <div
                        key={review.id}
                        data-testid={`card-guest-review-${review.id}`}
                        className="p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {property?.name || `Property #${review.propertyId}`}
                          </span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.reviewText && (
                          <p className="text-sm text-muted-foreground">{review.reviewText}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(review.reviewDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No reviews yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Delete Guest</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this guest? Their bookings will be unlinked but not deleted.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-delete-guest"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteGuest.isPending}
            >
              {deleteGuest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
