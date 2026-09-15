import type { PropertyFact } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

const statusLabels: Record<string, string> = {
  verified: "Verified",
  historical: "Historical",
  needs_verification: "Needs verification",
  expired: "Expired",
};

export function PropertyFacts({ facts }: { facts: PropertyFact[] }) {
  if (!facts.length) return null;

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" /> Channel facts and observations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {facts.map((fact) => (
          <div key={fact.id} className="rounded-xl border border-border/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{fact.label}</p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{fact.value}</p>
              </div>
              <Badge variant={fact.status === "needs_verification" ? "destructive" : "secondary"}>
                {statusLabels[fact.status] || fact.status}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Observed {fact.observedAt} · Source: {fact.source}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
