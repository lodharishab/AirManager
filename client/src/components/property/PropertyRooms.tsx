import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateRoom, useUpdateRoom, useDeleteRoom } from "@/lib/api";
import { Plus, Trash2, Pencil, DoorOpen, Loader2 } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@shared/currency";

interface Room {
  id: number;
  roomType: string;
  roomCount: number;
  nightlyRate: number;
}

interface PropertyRoomsProps {
  propertyId: number;
  rooms: Room[];
  currency?: string;
}

export function PropertyRooms({ propertyId, rooms, currency = "INR" }: PropertyRoomsProps) {
  const { toast } = useToast();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editRoomDialogOpen, setEditRoomDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomType: "", roomCount: 1, nightlyRate: 0 });
  const [editRoomData, setEditRoomData] = useState<{ id: number; roomType: string; roomCount: number; nightlyRate: number } | null>(null);

  const symbol = getCurrencySymbol(currency);

  return (
    <>
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
            <DoorOpen className="h-4 w-4" /> Room Types
          </CardTitle>
          <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-room" variant="outline" size="sm" className="rounded-lg h-8">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Room Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="font-serif text-primary">Add Room Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Room Type Name</Label>
                  <Input
                    data-testid="input-room-type"
                    value={newRoom.roomType}
                    onChange={(e) => setNewRoom(r => ({ ...r, roomType: e.target.value }))}
                    placeholder="e.g. Deluxe, Standard"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Rooms</Label>
                  <Input
                    data-testid="input-room-count"
                    type="number"
                    min={1}
                    value={newRoom.roomCount}
                    onChange={(e) => setNewRoom(r => ({ ...r, roomCount: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nightly Rate ({symbol})</Label>
                  <Input
                    data-testid="input-room-rate"
                    type="number"
                    value={newRoom.nightlyRate || ""}
                    onChange={(e) => setNewRoom(r => ({ ...r, nightlyRate: Number(e.target.value) }))}
                    placeholder="e.g. 3000"
                  />
                </div>
                <Button
                  data-testid="button-submit-room"
                  className="w-full text-primary-foreground"
                  onClick={() => {
                    if (!newRoom.roomType || !newRoom.nightlyRate) {
                      toast({ title: "Please fill in all fields", variant: "destructive" });
                      return;
                    }
                    createRoom.mutate(
                      { propertyId, ...newRoom },
                      {
                        onSuccess: () => {
                          toast({ title: "Room type added" });
                          setRoomDialogOpen(false);
                          setNewRoom({ roomType: "", roomCount: 1, nightlyRate: 0 });
                        },
                      }
                    );
                  }}
                  disabled={createRoom.isPending}
                >
                  {createRoom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Room Type
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {rooms && rooms.length > 0 ? (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div key={room.id} data-testid={`room-item-${room.id}`} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30 group hover:border-primary/30 transition-colors">
                  <div>
                    <div className="font-medium text-sm">{room.roomType}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {room.roomCount} room{room.roomCount > 1 ? "s" : ""} · {room.nightlyRate > 0 ? formatCurrency(room.nightlyRate, currency) : "Rate unverified"}/night
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Edit room type" data-testid={`button-edit-room-${room.id}`}
                      onClick={() => {
                        setEditRoomData({ id: room.id, roomType: room.roomType, roomCount: room.roomCount, nightlyRate: room.nightlyRate });
                        setEditRoomDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label="Delete room type" data-testid={`button-delete-room-${room.id}`}
                      onClick={() => {
                        deleteRoom.mutate(
                          { id: room.id, propertyId },
                          { onSuccess: () => toast({ title: "Room type removed" }) }
                        );
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <DoorOpen className="mx-auto h-8 w-8 mb-2 opacity-40" />
              No room types added yet. Add room types to enable room-based bookings.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editRoomDialogOpen} onOpenChange={setEditRoomDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary">Edit Room Type</DialogTitle>
          </DialogHeader>
          {editRoomData && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Room Type Name</Label>
                <Input
                  data-testid="input-edit-room-type"
                  value={editRoomData.roomType}
                  onChange={(e) => setEditRoomData(r => r ? { ...r, roomType: e.target.value } : r)}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Rooms</Label>
                <Input
                  data-testid="input-edit-room-count"
                  type="number"
                  min={1}
                  value={editRoomData.roomCount}
                  onChange={(e) => setEditRoomData(r => r ? { ...r, roomCount: Number(e.target.value) } : r)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nightly Rate ({symbol})</Label>
                <Input
                  data-testid="input-edit-room-rate"
                  type="number"
                  value={editRoomData.nightlyRate || ""}
                  onChange={(e) => setEditRoomData(r => r ? { ...r, nightlyRate: Number(e.target.value) } : r)}
                />
              </div>
              <Button
                data-testid="button-save-room"
                className="w-full text-primary-foreground"
                onClick={() => {
                  if (!editRoomData.roomType || !editRoomData.nightlyRate) {
                    toast({ title: "Please fill in all fields", variant: "destructive" });
                    return;
                  }
                  updateRoom.mutate(
                    { id: editRoomData.id, propertyId, roomType: editRoomData.roomType, roomCount: editRoomData.roomCount, nightlyRate: editRoomData.nightlyRate },
                    {
                      onSuccess: () => {
                        toast({ title: "Room type updated" });
                        setEditRoomDialogOpen(false);
                        setEditRoomData(null);
                      },
                    }
                  );
                }}
                disabled={updateRoom.isPending}
              >
                {updateRoom.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
