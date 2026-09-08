import { useState } from "react";
import {
  useFollowUps,
  useFollowUpStats,
  useRunFollowUps,
  useCancelFollowUp,
  useFollowUpRules,
  useCreateFollowUpRule,
  useUpdateFollowUpRule,
  useDeleteFollowUpRule,
} from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Loader2, Play, Plus, Clock, Send, AlertCircle, XCircle, Trash2, Timer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

const CHANNELS = ["direct", "email", "whatsapp", "instagram"] as const;

export default function FollowUps() {
  const { data: followUps = [], isLoading } = useFollowUps();
  const { data: stats } = useFollowUpStats();
  const { data: rules = [] } = useFollowUpRules();
  const runSweep = useRunFollowUps();
  const cancelFollowUp = useCancelFollowUp();
  const createRule = useCreateFollowUpRule();
  const updateRule = useUpdateFollowUpRule();
  const deleteRule = useDeleteFollowUpRule();
  const { toast } = useToast();

  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    trigger: "enquiry_unanswered",
    delayHours: 24,
    channel: "direct",
    maxPerEnquiry: 2,
    promptTemplate: "",
  });

  const pending = followUps.filter((f) => f.status === "pending");
  const history = followUps.filter((f) => f.status !== "pending");

  const handleRunNow = () => {
    runSweep.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: "Follow-up sweep complete",
          description: `${result.created} created — ${result.sent} sent, ${result.queued} queued for configured channels.`,
        });
      },
      onError: (error: Error) => {
        toast({ title: "Sweep failed", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleCreateRule = () => {
    if (!newRule.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    createRule.mutate(
      {
        name: newRule.name,
        trigger: newRule.trigger,
        delayHours: Number(newRule.delayHours),
        channel: newRule.channel,
        maxPerEnquiry: Number(newRule.maxPerEnquiry),
        promptTemplate: newRule.promptTemplate || null,
        enabled: true,
      },
      {
        onSuccess: () => {
          setRuleDialogOpen(false);
          setNewRule({ name: "", trigger: "enquiry_unanswered", delayHours: 24, channel: "direct", maxPerEnquiry: 2, promptTemplate: "" });
          toast({ title: "Rule created" });
        },
        onError: (error: Error) => {
          toast({ title: "Failed to create rule", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      sent: { label: "Sent", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300" },
      failed: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
      cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
    };
    const s = map[status] || { label: status, className: "" };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Follow-ups</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automated guest follow-ups, swept every 2 hours. Unconfigured channels queue instead of sending.
            </p>
          </div>
          <Button
            onClick={handleRunNow}
            disabled={runSweep.isPending}
            data-testid="button-run-followups"
          >
            {runSweep.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run Now
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card data-testid="card-stat-pending">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Pending queue
              </div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-pending">{stats?.pending ?? "—"}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-sent-today">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Send className="h-4 w-4" /> Sent today
              </div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-sent-today">{stats?.sentToday ?? "—"}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-sent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" /> Sent total
              </div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-sent">{stats?.sent ?? "—"}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-failed">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" /> Failed
              </div>
              <p className="text-3xl font-bold mt-2" data-testid="text-stat-failed">{stats?.failed ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending queue</CardTitle>
            <CardDescription>Messages waiting to go out on their channel.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending follow-ups.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((f) => (
                    <TableRow key={f.id} data-testid={`row-followup-${f.id}`}>
                      <TableCell className="font-medium">{f.guestName || "—"}</TableCell>
                      <TableCell>{f.propertyName || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{f.channel}</Badge></TableCell>
                      <TableCell>{f.scheduledAt ? format(parseISO(f.scheduledAt), "MMM d, HH:mm") : "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{f.message || "—"}</TableCell>
                      <TableCell>{statusBadge(f.status)}</TableCell>
                      <TableCell>
                        {f.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelFollowUp.mutate(f.id)}
                            data-testid={`button-cancel-${f.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Sent, failed and cancelled follow-ups.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing here yet — run a sweep.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.guestName || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{f.channel}</Badge></TableCell>
                      <TableCell>{f.sentAt ? format(parseISO(f.sentAt), "MMM d, HH:mm") : "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{f.message || "—"}</TableCell>
                      <TableCell>{statusBadge(f.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rules</CardTitle>
              <CardDescription>When to follow up, on which channel, and how often per enquiry.</CardDescription>
            </div>
            <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-rule"><Plus className="h-4 w-4 mr-2" />New Rule</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New follow-up rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Unanswered enquiry nudge"
                      data-testid="input-rule-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trigger</Label>
                      <Select value={newRule.trigger} onValueChange={(v) => setNewRule({ ...newRule, trigger: v })}>
                        <SelectTrigger data-testid="select-rule-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enquiry_unanswered">Unanswered enquiry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select value={newRule.channel} onValueChange={(v) => setNewRule({ ...newRule, channel: v })}>
                        <SelectTrigger data-testid="select-rule-channel">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHANNELS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Delay (hours)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newRule.delayHours}
                        onChange={(e) => setNewRule({ ...newRule, delayHours: Number(e.target.value) })}
                        data-testid="input-rule-delay"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max per enquiry</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newRule.maxPerEnquiry}
                        onChange={(e) => setNewRule({ ...newRule, maxPerEnquiry: Number(e.target.value) })}
                        data-testid="input-rule-max"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Prompt template (optional)</Label>
                    <Textarea
                      value={newRule.promptTemplate}
                      onChange={(e) => setNewRule({ ...newRule, promptTemplate: e.target.value })}
                      placeholder="Leave empty to use the default AI prompt."
                      data-testid="textarea-rule-prompt"
                    />
                  </div>
                  <Button onClick={handleCreateRule} disabled={createRule.isPending} className="w-full" data-testid="button-create-rule">
                    {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Rule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No rules yet. Create one to start following up on unanswered enquiries.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Delay</TableHead>
                    <TableHead>Max/enquiry</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="text-muted-foreground">{rule.trigger}</TableCell>
                      <TableCell><Badge variant="outline">{rule.channel}</Badge></TableCell>
                      <TableCell>{rule.delayHours}h</TableCell>
                      <TableCell>{rule.maxPerEnquiry}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, enabled: checked })}
                          data-testid={`switch-rule-enabled-${rule.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteRule.mutate(rule.id)} data-testid={`button-delete-rule-${rule.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
