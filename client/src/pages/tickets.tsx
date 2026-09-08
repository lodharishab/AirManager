import { useState } from "react";
import {
  useTickets,
  useTicketStats,
  useTicketEvents,
  useRunTriage,
  useResolveTicket,
  useCloseTicket,
  useEscalateTicket,
  useCommentOnTicket,
} from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Play,
  Check,
  X,
  ArrowUpCircle,
  Inbox,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    normal: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    low: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[priority] || ""}>{priority}</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
    escalated: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    closed: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[status] || ""}>{status}</Badge>;
}

function TicketDetailDialog({ ticketId, onClose }: { ticketId: number | null; onClose: () => void }) {
  const { data: events = [] } = useTicketEvents(ticketId);
  const comment = useCommentOnTicket();
  const resolve = useResolveTicket();
  const escalate = useEscalateTicket();
  const [commentText, setCommentText] = useState("");

  const handleComment = () => {
    if (!ticketId || !commentText.trim()) return;
    comment.mutate({ id: ticketId, body: commentText.trim() }, {
      onSuccess: () => setCommentText(""),
    });
  };

  return (
    <Dialog open={ticketId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto" data-testid="dialog-ticket-detail">
        <DialogHeader>
          <DialogTitle>Ticket #{ticketId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3 border-l-2 border-border pl-4">
            {events.map((ev) => (
              <div key={ev.id} data-testid={`event-${ev.id}`}>
                <div className="text-xs text-muted-foreground">
                  {ev.createdAt ? format(parseISO(ev.createdAt), "MMM d, HH:mm") : ""}
                </div>
                <div className="text-sm">
                  <Badge variant="outline" className="mr-2">{ev.type}</Badge>
                  {ev.body}
                </div>
              </div>
            ))}
            {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => ticketId && resolve.mutate(ticketId)} data-testid="button-detail-resolve">
              <Check className="h-4 w-4 mr-1" /> Resolve
            </Button>
            <Button size="sm" variant="outline" onClick={() => ticketId && escalate.mutate(ticketId)} data-testid="button-detail-escalate">
              <ArrowUpCircle className="h-4 w-4 mr-1" /> Escalate
            </Button>
          </div>

          <div className="space-y-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="bg-background"
              data-testid="textarea-ticket-comment"
            />
            <Button size="sm" onClick={handleComment} disabled={comment.isPending || !commentText.trim()} data-testid="button-add-comment">
              {comment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Comment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Tickets() {
  const { data: tickets = [], isLoading } = useTickets();
  const { data: stats } = useTicketStats();
  const runTriage = useRunTriage();
  const resolve = useResolveTicket();
  const close = useCloseTicket();
  const escalate = useEscalateTicket();
  const [detailTicketId, setDetailTicketId] = useState<number | null>(null);
  const { toast } = useToast();

  const active = tickets.filter((t) => t.status === "open" || t.status === "escalated");
  const done = tickets.filter((t) => t.status === "resolved" || t.status === "closed");

  const handleRunTriage = () => {
    runTriage.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: "Triage complete",
          description: `${result.enquiriesTriaged} enquiry(ies) + ${result.reviewsTriaged} review(s) triaged${result.errors.length ? `, ${result.errors.length} error(s)` : ""}.`,
        });
      },
      onError: (error: Error) => {
        toast({ title: "Triage failed", description: error.message, variant: "destructive" });
      },
    });
  };

  const ticketRow = (t: (typeof tickets)[number], activeRow: boolean) => (
    <TableRow
      key={t.id}
      className="cursor-pointer"
      onClick={() => setDetailTicketId(t.id)}
      data-testid={`row-ticket-${t.id}`}
    >
      <TableCell className="font-medium">{t.subject}</TableCell>
      {activeRow && <TableCell>{t.guestName || "—"}</TableCell>}
      <TableCell><Badge variant="outline">{t.channel}</Badge></TableCell>
      {activeRow && <TableCell>{t.aiCategory ? <Badge variant="outline">{t.aiCategory}</Badge> : "—"}</TableCell>}
      {activeRow && <TableCell>{priorityBadge(t.priority)}</TableCell>}
      <TableCell>{t.propertyName || "—"}</TableCell>
      <TableCell>{statusBadge(t.status)}</TableCell>
      <TableCell>{t.createdAt ? format(parseISO(t.createdAt), "MMM d, HH:mm") : "—"}</TableCell>
      {activeRow && (
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex gap-1">
            <Button size="sm" variant="ghost" title="Escalate to host" onClick={() => escalate.mutate(t.id)} data-testid={`button-escalate-${t.id}`}>
              <ArrowUpCircle className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Resolve" onClick={() => resolve.mutate(t.id)} data-testid={`button-resolve-${t.id}`}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" title="Close" onClick={() => close.mutate(t.id)} data-testid={`button-close-${t.id}`}>
              <X className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-4 w-4 self-center text-muted-foreground" />
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Support Tickets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-triaged from new enquiries and low reviews every 2 hours. Urgent issues escalate to the host.
            </p>
          </div>
          <Button onClick={handleRunTriage} disabled={runTriage.isPending} data-testid="button-run-triage">
            {runTriage.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run Triage
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card data-testid="card-stat-open">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Inbox className="h-4 w-4" /> Open</div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-open">{stats?.open ?? "—"}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-escalated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertCircle className="h-4 w-4" /> Escalated to host</div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-escalated">{stats?.escalated ?? "—"}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-resolved">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> Resolved</div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-resolved">{stats?.resolved ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Active ({active.length})</CardTitle>
            <CardDescription>Open and escalated tickets. Click a row for the timeline.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : active.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active tickets.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{active.map((t) => ticketRow(t, true))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolved & closed ({done.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {done.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing here yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{done.map((t) => ticketRow(t, false))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <TicketDetailDialog ticketId={detailTicketId} onClose={() => setDetailTicketId(null)} />
      </main>
    </div>
  );
}
