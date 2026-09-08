import { useState } from "react";
import { useEnquiries, useProperties, useCreateEnquiry, useUpdateEnquiry, useDeleteEnquiry } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Loader2, Trash2, Mail, Phone } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const statusOptions = ["new", "responded", "converted", "closed"] as const;

export default function Enquiries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: enquiriesResult, isLoading } = useEnquiries();
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const createEnquiry = useCreateEnquiry();
  const updateEnquiry = useUpdateEnquiry();
  const deleteEnquiry = useDeleteEnquiry();
  const { toast } = useToast();

  const [newEnquiry, setNewEnquiry] = useState({
    propertyId: 0,
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    message: "",
    status: "new" as string,
  });

  const enquiries = enquiriesResult?.data || [];
  const properties = propertiesResult?.data || [];
  const allEnquiries = enquiries;
  const allProperties = properties || [];

  const filteredEnquiries = allEnquiries.filter((enquiry) => {
    const matchesSearch =
      enquiry.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enquiry.message || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enquiry.guestEmail || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || enquiry.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-primary/10 text-primary border-primary/20";
      case "responded":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "converted":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleCreateEnquiry = () => {
    if (!newEnquiry.guestName || !newEnquiry.propertyId) {
      toast({ title: "Please fill in guest name and property", variant: "destructive" });
      return;
    }
    createEnquiry.mutate(newEnquiry, {
      onSuccess: () => {
        toast({ title: "Enquiry created successfully" });
        setDialogOpen(false);
        setNewEnquiry({ propertyId: 0, guestName: "", guestEmail: "", guestPhone: "", message: "", status: "new" });
      },
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateEnquiry.mutate({ id, status }, {
      onSuccess: () => {
        toast({ title: `Status updated to ${status}` });
      },
    });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteEnquiry.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Enquiry deleted" });
        setDeleteId(null);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 data-testid="text-enquiries-title" className="text-3xl font-bold tracking-tight font-serif text-primary">
            Enquiries
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage guest enquiries and interest.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-enquiry" className="rounded-xl shadow-sm text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> New Enquiry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Add New Enquiry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input
                  data-testid="input-enquiry-guest-name"
                  value={newEnquiry.guestName}
                  onChange={(e) => setNewEnquiry((prev) => ({ ...prev, guestName: e.target.value }))}
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select
                  value={newEnquiry.propertyId ? String(newEnquiry.propertyId) : ""}
                  onValueChange={(val) => setNewEnquiry((prev) => ({ ...prev, propertyId: Number(val) }))}
                >
                  <SelectTrigger data-testid="select-enquiry-property">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProperties.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    data-testid="input-enquiry-email"
                    type="email"
                    value={newEnquiry.guestEmail}
                    onChange={(e) => setNewEnquiry((prev) => ({ ...prev, guestEmail: e.target.value }))}
                    placeholder="guest@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    data-testid="input-enquiry-phone"
                    type="tel"
                    value={newEnquiry.guestPhone}
                    onChange={(e) => setNewEnquiry((prev) => ({ ...prev, guestPhone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  data-testid="input-enquiry-message"
                  value={newEnquiry.message}
                  onChange={(e) => setNewEnquiry((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Guest's enquiry or question..."
                  rows={3}
                />
              </div>
              <Button
                data-testid="button-submit-enquiry"
                className="w-full text-primary-foreground"
                onClick={handleCreateEnquiry}
                disabled={createEnquiry.isPending}
              >
                {createEnquiry.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Enquiry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm rounded-2xl overflow-hidden border-border">
        <div className="p-4 border-b border-border bg-secondary/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-enquiries"
              placeholder="Search by name, email, or message..."
              className="pl-9 rounded-xl bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["all", ...statusOptions].map((status) => (
              <Button
                key={status}
                data-testid={`button-filter-enquiry-${status}`}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className={`rounded-full capitalize text-xs min-h-[44px] ${
                  statusFilter === status ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="hover:bg-transparent border-b-border">
                <TableHead className="w-[180px]">Guest</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="hidden lg:table-cell">Message</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnquiries.length > 0 ? (
                filteredEnquiries.map((enquiry) => {
                  const property = allProperties.find((p) => p.id === enquiry.propertyId);
                  return (
                    <TableRow
                      key={enquiry.id}
                      data-testid={`row-enquiry-${enquiry.id}`}
                      className="hover:bg-muted/30 transition-colors border-b-border/50"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {enquiry.guestName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          {enquiry.guestName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{property?.name || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[250px]">
                        <span className="text-muted-foreground text-sm whitespace-pre-wrap break-words">{enquiry.message || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          {enquiry.guestEmail && (
                            <a href={`mailto:${enquiry.guestEmail}`} title={enquiry.guestEmail} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Mail className="h-4 w-4 hover:text-primary transition-colors" />
                            </a>
                          )}
                          {enquiry.guestPhone && (
                            <a href={`tel:${enquiry.guestPhone}`} title={enquiry.guestPhone} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Phone className="h-4 w-4 hover:text-primary transition-colors" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {format(parseISO(enquiry.createdAt), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Badge
                                data-testid={`badge-status-${enquiry.id}`}
                                variant="outline"
                                className={`uppercase tracking-wider text-[10px] cursor-pointer hover:opacity-80 ${getStatusColor(enquiry.status)}`}
                              >
                                {enquiry.status}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {statusOptions.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                data-testid={`menu-status-${s}-${enquiry.id}`}
                                className="capitalize"
                                onClick={() => handleStatusChange(enquiry.id, s)}
                              >
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <Button
                          aria-label="Delete enquiry" data-testid={`button-delete-enquiry-${enquiry.id}`}
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(enquiry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No enquiries found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {filteredEnquiries.length > 0 ? (
            filteredEnquiries.map((enquiry) => {
              const property = allProperties.find((p) => p.id === enquiry.propertyId);
              return (
                <div key={enquiry.id} data-testid={`card-enquiry-mobile-${enquiry.id}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {enquiry.guestName.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{enquiry.guestName}</p>
                        <p className="text-xs text-muted-foreground truncate">{property?.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <Badge
                              data-testid={`badge-status-mobile-${enquiry.id}`}
                              variant="outline"
                              className={`uppercase tracking-wider text-[10px] cursor-pointer hover:opacity-80 ${getStatusColor(enquiry.status)}`}
                            >
                              {enquiry.status}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {statusOptions.map((s) => (
                            <DropdownMenuItem key={s} className="capitalize" onClick={() => handleStatusChange(enquiry.id, s)}>
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {enquiry.message && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{enquiry.message}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{format(parseISO(enquiry.createdAt), "MMM d, yyyy")}</span>
                    <div className="flex items-center gap-1">
                      {enquiry.guestEmail && (
                        <a href={`mailto:${enquiry.guestEmail}`} className="p-2 text-muted-foreground hover:text-primary min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {enquiry.guestPhone && (
                        <a href={`tel:${enquiry.guestPhone}`} className="p-2 text-muted-foreground hover:text-primary min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        aria-label="Delete enquiry" data-testid={`button-delete-enquiry-mobile-${enquiry.id}`}
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(enquiry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No enquiries found matching your criteria.
            </div>
          )}
        </div>

        <div className="p-4 border-t text-sm text-muted-foreground flex justify-between items-center">
          Showing {filteredEnquiries.length} of {allEnquiries.length} enquiries
        </div>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this enquiry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
