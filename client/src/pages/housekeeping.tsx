import { useState } from "react";
import {
  useHousekeepingTasks,
  useProperties,
  useBookings,
  useCreateHousekeepingTask,
  useUpdateHousekeepingTask,
  useDeleteHousekeepingTask,
} from "@/lib/api";
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
import { Search, Plus, Loader2, Trash2, Pencil, CalendarDays } from "lucide-react";
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

const typeOptions = ["cleaning", "maintenance", "inspection"] as const;
const statusOptions = ["pending", "in_progress", "completed"] as const;
const priorityOptions = ["low", "medium", "high", "urgent"] as const;

const emptyTask = {
  propertyId: 0,
  type: "cleaning" as string,
  title: "",
  description: "",
  status: "pending" as string,
  assignee: "",
  dueDate: "",
  priority: "medium" as string,
  bookingId: null as number | null,
};

export default function Housekeeping() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...emptyTask });

  const { data: tasksResult, isLoading } = useHousekeepingTasks({ page: 1, limit: 10000 });
  const { data: propertiesResult } = useProperties({ page: 1, limit: 10000 });
  const { data: bookingsResult } = useBookings({ page: 1, limit: 10000 });
  const createTask = useCreateHousekeepingTask();
  const updateTask = useUpdateHousekeepingTask();
  const deleteTask = useDeleteHousekeepingTask();
  const { toast } = useToast();

  const allTasks = tasksResult?.data || [];
  const allProperties = propertiesResult?.data || [];
  const allBookings = bookingsResult?.data || [];

  const assignees = Array.from(new Set(allTasks.map((t) => t.assignee).filter((a): a is string => Boolean(a))));

  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.assignee || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesType = typeFilter === "all" || task.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesProperty = propertyFilter === "all" || String(task.propertyId) === propertyFilter;
    const matchesAssignee = assigneeFilter === "all" || task.assignee === assigneeFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesProperty && matchesAssignee;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "completed":
        return "bg-secondary/10 text-secondary border-secondary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "medium":
        return "bg-primary/10 text-primary border-primary/20";
      case "low":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "cleaning":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "maintenance":
        return "bg-violet-500/10 text-violet-600 border-violet-500/20";
      case "inspection":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const statusLabel = (s: string) => s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1);

  const getPropertyName = (id: number) => allProperties.find((p) => p.id === id)?.name || "Unknown";

  const getBookingInfo = (bookingId: number | null) => {
    if (!bookingId) return null;
    return allBookings.find((b) => b.id === bookingId);
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setFormData({ ...emptyTask });
    setDialogOpen(true);
  };

  const openEditDialog = (task: typeof allTasks[0]) => {
    setEditingTask(task.id);
    setFormData({
      propertyId: task.propertyId,
      type: task.type,
      title: task.title,
      description: task.description || "",
      status: task.status,
      assignee: task.assignee || "",
      dueDate: task.dueDate || "",
      priority: task.priority,
      bookingId: task.bookingId,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.propertyId) {
      toast({ title: "Please fill in title and property", variant: "destructive" });
      return;
    }
    const payload = {
      ...formData,
      bookingId: formData.bookingId || null,
    };

    if (editingTask) {
      updateTask.mutate({ id: editingTask, ...payload }, {
        onSuccess: () => {
          toast({ title: "Task updated successfully" });
          setDialogOpen(false);
          setEditingTask(null);
        },
      });
    } else {
      createTask.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Task created successfully" });
          setDialogOpen(false);
          setFormData({ ...emptyTask });
        },
      });
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateTask.mutate({ id, status }, {
      onSuccess: () => {
        toast({ title: `Status updated to ${statusLabel(status)}` });
      },
    });
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteTask.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Task deleted" });
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
          <h1 data-testid="text-housekeeping-title" className="text-3xl font-bold tracking-tight font-serif text-primary">
            Housekeeping
          </h1>
          <p className="text-muted-foreground mt-1">Manage cleaning, maintenance, and inspection tasks.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-task" className="rounded-xl shadow-sm text-primary-foreground" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">
                {editingTask ? "Edit Task" : "Create New Task"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  data-testid="input-task-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Turnover cleaning after checkout"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property *</Label>
                  <Select
                    value={formData.propertyId ? String(formData.propertyId) : ""}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, propertyId: Number(val) }))}
                  >
                    <SelectTrigger data-testid="select-task-property">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProperties.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger data-testid="select-task-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  data-testid="input-task-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger data-testid="select-task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Input
                    data-testid="input-task-assignee"
                    value={formData.assignee}
                    onChange={(e) => setFormData((prev) => ({ ...prev, assignee: e.target.value }))}
                    placeholder="e.g. Priya Devi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    data-testid="input-task-due-date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Linked Booking (optional)</Label>
                <Select
                  value={formData.bookingId ? String(formData.bookingId) : "none"}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, bookingId: val === "none" ? null : Number(val) }))}
                >
                  <SelectTrigger data-testid="select-task-booking">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allBookings.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.guestName} - {getPropertyName(b.propertyId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                data-testid="button-save-task"
                className="w-full rounded-xl text-primary-foreground"
                onClick={handleSave}
                disabled={createTask.isPending || updateTask.isPending}
              >
                {(createTask.isPending || updateTask.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-muted-foreground" />
            <Input
              data-testid="input-search-tasks"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="filter-status" className="w-[140px] min-h-[44px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger data-testid="filter-type" className="w-[140px] min-h-[44px] text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="filter-priority" className="w-[140px] min-h-[44px] text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorityOptions.map((p) => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger data-testid="filter-property" className="w-[160px] min-h-[44px] text-xs">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {allProperties.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {assignees.length > 0 && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger data-testid="filter-assignee" className="w-[140px] min-h-[44px] text-xs">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a} value={a!}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  const booking = getBookingInfo(task.bookingId);
                  return (
                    <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                      <TableCell>
                        <div>
                          <p data-testid={`text-task-title-${task.id}`} className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                          {booking && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <CalendarDays size={12} />
                              <span>{booking.guestName} &middot; {booking.checkIn.split("T")[0]} to {booking.checkOut.split("T")[0]}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getPropertyName(task.propertyId)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getTypeColor(task.type)}`}>
                          {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button data-testid={`badge-status-${task.id}`} className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Badge variant="outline" className={`text-xs cursor-pointer ${getStatusColor(task.status)}`}>
                                {statusLabel(task.status)}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {statusOptions.map((s) => (
                              <DropdownMenuItem key={s} onClick={() => handleStatusChange(task.id, s)}>
                                {statusLabel(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{task.assignee || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{task.dueDate || "-"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            data-testid={`button-edit-task-${task.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11"
                            onClick={() => openEditDialog(task)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            data-testid={`button-delete-task-${task.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(task.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No tasks found
            </div>
          ) : (
            filteredTasks.map((task) => {
              const booking = getBookingInfo(task.bookingId);
              return (
                <div key={task.id} data-testid={`card-task-mobile-${task.id}`} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p data-testid={`text-task-title-mobile-${task.id}`} className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{getPropertyName(task.propertyId)}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        data-testid={`button-edit-task-mobile-${task.id}`}
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        onClick={() => openEditDialog(task)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        data-testid={`button-delete-task-mobile-${task.id}`}
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 text-destructive"
                        onClick={() => setDeleteId(task.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${getTypeColor(task.type)}`}>
                      {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
                          <Badge variant="outline" className={`text-xs cursor-pointer ${getStatusColor(task.status)}`}>
                            {statusLabel(task.status)}
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {statusOptions.map((s) => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChange(task.id, s)}>
                            {statusLabel(s)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.assignee && <span>Assignee: {task.assignee}</span>}
                    {task.dueDate && <span>Due: {task.dueDate}</span>}
                  </div>
                  {booking && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays size={12} />
                      <span>{booking.guestName} · {booking.checkIn.split("T")[0]} to {booking.checkOut.split("T")[0]}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-delete" onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
