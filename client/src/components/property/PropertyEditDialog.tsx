import type { InsertProperty } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "@shared/currency";

interface PropertyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData: Partial<InsertProperty>;
  setEditData: React.Dispatch<React.SetStateAction<Partial<InsertProperty>>>;
  onSave: () => void;
  isPending: boolean;
}

export function PropertyEditDialog({ open, onOpenChange, editData, setEditData, onSave, isPending }: PropertyEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary">Edit Property</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Property Name</Label>
              <Input value={editData.name || ""} onChange={(e) => setEditData(d => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
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
              <Label>Currency</Label>
              <Select value={editData.currency || "INR"} onValueChange={(v) => setEditData(d => ({ ...d, currency: v }))}>
                <SelectTrigger data-testid="select-edit-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} – {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nightly Rate ({getCurrencySymbol(editData.currency || "INR")})</Label>
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
            onClick={onSave}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
