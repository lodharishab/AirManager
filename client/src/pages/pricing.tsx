import {
  usePriceRecommendations,
  useRunPricingRecommendations,
  useApprovePriceRecommendation,
  useRejectPriceRecommendation,
} from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Play, Check, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function priceDelta(current: number, recommended: number) {
  const diff = recommended - current;
  const pct = current > 0 ? Math.round((diff / current) * 100) : 0;
  if (diff > 0) {
    return { icon: <TrendingUp className="h-4 w-4 text-green-600" />, pct, dir: "up" as const };
  }
  if (diff < 0) {
    return { icon: <TrendingDown className="h-4 w-4 text-red-600" />, pct, dir: "down" as const };
  }
  return { icon: <Minus className="h-4 w-4 text-muted-foreground" />, pct, dir: "flat" as const };
}

function confidenceBadge(confidence: number) {
  if (confidence >= 75) return <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">{confidence}%</Badge>;
  if (confidence >= 50) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">{confidence}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">{confidence}%</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300" },
    approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
    superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
  };
  const s = map[status] || { label: status, className: "" };
  return <Badge className={s.className}>{s.label}</Badge>;
}

export default function Pricing() {
  const { data: recommendations = [], isLoading } = usePriceRecommendations();
  const runPricing = useRunPricingRecommendations();
  const approve = useApprovePriceRecommendation();
  const reject = useRejectPriceRecommendation();
  const { toast } = useToast();

  const pending = recommendations.filter((r) => r.status === "pending");
  const history = recommendations.filter((r) => r.status !== "pending");

  const handleRun = () => {
    runPricing.mutate(undefined, {
      onSuccess: (result) => {
        toast({
          title: "Pricing analysis complete",
          description:
            result.errors.length > 0
              ? `${result.created} recommendation(s) created, ${result.skipped} kept — ${result.errors.length} error(s).`
              : `${result.created} recommendation(s) created, ${result.skipped} property/ies needed no change.`,
        });
      },
      onError: (error: Error) => {
        toast({ title: "Pricing run failed", description: error.message, variant: "destructive" });
      },
    });
  };

  const handleApprove = (id: number) => {
    approve.mutate(id, {
      onSuccess: () => toast({ title: "Price updated", description: "Recommendation approved and applied to the property." }),
      onError: (error: Error) => toast({ title: "Approve failed", description: error.message, variant: "destructive" }),
    });
  };

  const handleReject = (id: number) => {
    reject.mutate(id, {
      onSuccess: () => toast({ title: "Recommendation rejected" }),
      onError: (error: Error) => toast({ title: "Reject failed", description: error.message, variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">AI Pricing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily recommendations at 05:15. Prices change only when you approve.
            </p>
          </div>
          <Button
            onClick={handleRun}
            disabled={runPricing.isPending}
            data-testid="button-run-pricing"
          >
            {runPricing.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run Analysis
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending approval ({pending.length})</CardTitle>
            <CardDescription>Review the AI's reasoning and confidence before applying a price.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending recommendations. Run an analysis to generate some.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Recommended</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((rec) => {
                    const delta = priceDelta(rec.currentPrice, rec.recommendedPrice);
                    return (
                      <TableRow key={rec.id} data-testid={`row-price-rec-${rec.id}`}>
                        <TableCell className="font-medium">{rec.propertyName || `#${rec.propertyId}`}</TableCell>
                        <TableCell data-testid={`text-current-${rec.id}`}>{rec.currentPrice} {rec.propertyCurrency}</TableCell>
                        <TableCell className="font-semibold" data-testid={`text-recommended-${rec.id}`}>{rec.recommendedPrice} {rec.propertyCurrency}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1">
                            {delta.icon}
                            <span data-testid={`text-delta-${rec.id}`}>{delta.pct > 0 ? "+" : ""}{delta.pct}%</span>
                          </span>
                        </TableCell>
                        <TableCell>{confidenceBadge(rec.confidence)}</TableCell>
                        <TableCell className="max-w-sm text-sm text-muted-foreground" data-testid={`text-reason-${rec.id}`}>{rec.reason}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleApprove(rec.id)}
                              disabled={approve.isPending}
                              data-testid={`button-approve-${rec.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(rec.id)}
                              disabled={reject.isPending}
                              data-testid={`button-reject-${rec.id}`}
                            >
                              <X className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Approved, rejected and superseded recommendations.</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nothing here yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Current → Recommended</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.propertyName || `#${rec.propertyId}`}</TableCell>
                      <TableCell>{rec.currentPrice} → {rec.recommendedPrice} {rec.propertyCurrency}</TableCell>
                      <TableCell>{rec.confidence}%</TableCell>
                      <TableCell>{statusBadge(rec.status)}</TableCell>
                      <TableCell>{rec.createdAt ? format(parseISO(rec.createdAt), "MMM d, HH:mm") : "—"}</TableCell>
                      <TableCell>{rec.reviewedAt ? format(parseISO(rec.reviewedAt), "MMM d, HH:mm") : "—"}</TableCell>
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
