import { formatCurrency } from "@shared/currency";
import { useState, useEffect } from "react";
import { useGuests, useCreateGuest, useDeleteGuest, useProperties } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Loader2, Users, Mail, Phone, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const PAGE_SIZE = 20;

export default function Guests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: guestsResult, isLoading } = useGuests({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const primaryCurrency = propertiesResult?.data[0]?.currency || "INR";
  const createGuest = useCreateGuest();
  const _deleteGuest = useDeleteGuest();

  const [newGuest, setNewGuest] = useState({
    name: "",
    email: "",
    phone: "",
    nationality: "",
    notes: "",
    tags: "",
  });

  const guestsList = guestsResult?.data || [];
  const totalGuests = guestsResult?.total || 0;
  const totalPages = Math.ceil(totalGuests / PAGE_SIZE);

  const handleCreateGuest = () => {
    if (!newGuest.name) {
      toast({ title: "Guest name is required", variant: "destructive" });
      return;
    }
    const tags = newGuest.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    createGuest.mutate(
      {
        name: newGuest.name,
        email: newGuest.email || undefined,
        phone: newGuest.phone || undefined,
        nationality: newGuest.nationality || undefined,
        notes: newGuest.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Guest created successfully" });
          setDialogOpen(false);
          setNewGuest({ name: "", email: "", phone: "", nationality: "", notes: "", tags: "" });
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 data-testid="text-guests-title" className="text-3xl font-bold tracking-tight font-serif text-primary">
            Guests
          </h1>
          <p className="text-muted-foreground mt-1">Manage your guest profiles and history.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-guest" className="rounded-xl shadow-sm text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> New Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Add New Guest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  data-testid="input-guest-name-new"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest((g) => ({ ...g, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  data-testid="input-guest-email"
                  type="email"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest((g) => ({ ...g, email: e.target.value }))}
                  placeholder="guest@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  data-testid="input-guest-phone"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest((g) => ({ ...g, phone: e.target.value }))}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input
                  data-testid="input-guest-nationality"
                  value={newGuest.nationality}
                  onChange={(e) => setNewGuest((g) => ({ ...g, nationality: e.target.value }))}
                  placeholder="e.g. American"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  data-testid="input-guest-tags"
                  value={newGuest.tags}
                  onChange={(e) => setNewGuest((g) => ({ ...g, tags: e.target.value }))}
                  placeholder="VIP, repeat guest"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  data-testid="input-guest-notes"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newGuest.notes}
                  onChange={(e) => setNewGuest((g) => ({ ...g, notes: e.target.value }))}
                  placeholder="Preferences, special requests..."
                  rows={2}
                />
              </div>
              <Button
                data-testid="button-submit-guest"
                className="w-full text-primary-foreground"
                onClick={handleCreateGuest}
                disabled={createGuest.isPending}
              >
                {createGuest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Guest
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm rounded-2xl overflow-hidden border-border">
        <div className="p-4 border-b border-border bg-secondary/20">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-guests"
              placeholder="Search by name, email, phone..."
              className="pl-9 rounded-xl bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-secondary/20">
              <TableRow className="hover:bg-transparent border-b-border">
                <TableHead className="w-[220px]">Guest</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Total Stays</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guestsList.length > 0 ? (
                guestsList.map((guest) => (
                  <TableRow
                    key={guest.id}
                    data-testid={`row-guest-${guest.id}`}
                    className="hover:bg-muted/30 transition-colors cursor-pointer border-b-border/50"
                    role="link" tabIndex={0} aria-label={`View ${guest.name}`} onKeyDown={e => { if (e.key === "Enter") setLocation(`/guests/${guest.id}`); }}
                    onClick={() => setLocation(`/guests/${guest.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {guest.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div>{guest.name}</div>
                          {guest.nationality && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {guest.nationality}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {guest.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {guest.email}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {guest.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {guest.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{guest.totalStays}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(guest.totalSpent || 0, primaryCurrency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {guest.lastVisit
                        ? format(parseISO(guest.lastVisit), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(guest.tags || []).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      No guests found.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t text-sm text-muted-foreground flex justify-between items-center">
          <span data-testid="text-guests-count">
            Showing {guestsList.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}-
            {Math.min(page * PAGE_SIZE, totalGuests)} of {totalGuests} guests
          </span>
          <div className="flex gap-1 items-center">
            <Button
              data-testid="button-guests-prev-page"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              className="rounded-lg h-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-2 text-xs">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              data-testid="button-guests-next-page"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              className="rounded-lg h-8"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
