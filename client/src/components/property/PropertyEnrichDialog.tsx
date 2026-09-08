import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUpdateProperty } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Wand2, Check, AlertCircle } from "lucide-react";
import { LINK_TYPE_ICONS, FIELD_LABELS } from "./constants";

interface PropertyLink {
  id: number;
  label: string;
  url: string;
  linkType: string;
}

interface PropertyEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: number;
    links?: PropertyLink[] | null;
    [key: string]: unknown;
  };
}

export function PropertyEnrichDialog({ open, onOpenChange, property }: PropertyEnrichDialogProps) {
  const { toast } = useToast();
  const updateProperty = useUpdateProperty();

  const [enriching, setEnriching] = useState(false);
  const [enrichStreamText, setEnrichStreamText] = useState("");
  const [enrichResult, setEnrichResult] = useState<Record<string, unknown> | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [applyingFields, setApplyingFields] = useState(false);

  const runAIEnrich = useCallback(async () => {
    if (!property) return;
    setEnriching(true);
    setEnrichStreamText("");
    setEnrichResult(null);
    setEnrichError(null);
    setSelectedFields(new Set());

    try {
      const response = await fetch(`/api/properties/${property.id}/ai-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const err = await response.json();
        setEnrichError((err instanceof Error ? err.message : String(err)) || "Failed to start AI enrichment");
        setEnriching(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setEnrichError("No response stream available");
        setEnriching(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) {
              setEnrichError(parsed.error);
              setEnriching(false);
              return;
            }
            if (parsed.content) {
              accumulated += parsed.content;
              setEnrichStreamText(accumulated);
            }
            if (parsed.done) {
              const finalText = parsed.fullResponse || accumulated;
              try {
                const cleaned = finalText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
                const result = JSON.parse(cleaned);
                setEnrichResult(result);
                const extractedKeys = Object.keys(result).filter(k => k !== "summary" && FIELD_LABELS[k]);
                setSelectedFields(new Set(extractedKeys));
              } catch {
                setEnrichError("AI returned invalid data format. Please try again.");
              }
            }
          } catch { /* SSE line parse failures are non-fatal */ }
        }
      }
    } catch (err: unknown) {
      setEnrichError((err instanceof Error ? err.message : String(err)) || "Connection error");
    } finally {
      setEnriching(false);
    }
  }, [property]);

  const handleApplyFields = () => {
    if (!property || !enrichResult || selectedFields.size === 0) return;
    setApplyingFields(true);

    const updateData: Record<string, unknown> = {};
    Array.from(selectedFields).forEach(field => {
      if (enrichResult[field] !== undefined) {
        updateData[field] = enrichResult[field];
      }
    });

    updateProperty.mutate(
      { id: property.id, ...updateData },
      {
        onSuccess: () => {
          toast({ title: "Property updated with AI-extracted data" });
          onOpenChange(false);
          setApplyingFields(false);
          queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
        },
        onError: () => {
          toast({ title: "Failed to apply changes", variant: "destructive" });
          setApplyingFields(false);
        },
      }
    );
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const formatFieldValue = (key: string, value: unknown): string => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "number" && key === "nightlyRate") return value.toLocaleString();
    if (typeof value === "number") return String(value);
    if (typeof value === "string" && value.length > 120) return value.slice(0, 120) + "…";
    return String(value);
  };

  const enrichableFields = enrichResult
    ? Object.entries(enrichResult).filter(([k]) => k !== "summary" && FIELD_LABELS[k])
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!enriching) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-primary flex items-center gap-2">
            <Wand2 className="h-5 w-5" /> AI Property Enrichment
          </DialogTitle>
        </DialogHeader>

        {!enriching && !enrichResult && !enrichError && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI will fetch content from all <span className="text-primary font-medium">{property.links?.length || 0} saved links</span> and extract structured property details. You'll be able to review the extracted data before applying any changes.
              </p>
            </div>
            <div className="space-y-2">
              {property.links?.map((link) => (
                <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <span>{LINK_TYPE_ICONS[link.linkType] || "🔗"}</span>
                  <span className="truncate flex-1">{link.label}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link.url}</span>
                </div>
              ))}
            </div>
            <Button
              data-testid="button-start-enrich"
              className="w-full text-primary-foreground"
              onClick={runAIEnrich}
            >
              <Wand2 className="h-4 w-4 mr-2" /> Start AI Enrichment
            </Button>
          </div>
        )}

        {enriching && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Analyzing your links...</p>
                <p className="text-xs text-muted-foreground mt-0.5">Fetching content and extracting property data with AI</p>
              </div>
            </div>
            {enrichStreamText && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30 max-h-[200px] overflow-y-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{enrichStreamText}</pre>
              </div>
            )}
          </div>
        )}

        {enrichError && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm">{enrichError}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setEnrichError(null); }}>
              Try Again
            </Button>
          </div>
        )}

        {enrichResult && !enriching && (
          <div className="space-y-4 pt-2">
            {typeof enrichResult.summary === "string" && enrichResult.summary && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground leading-relaxed">{enrichResult.summary}</p>
              </div>
            )}

            {enrichableFields.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Select fields to apply:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedFields(new Set(enrichableFields.map(([k]) => k)))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedFields(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {enrichableFields.map(([key, value]) => {
                    const currentValue = property[key];
                    const isNew = !currentValue || (Array.isArray(currentValue) && currentValue.length === 0);
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                          selectedFields.has(key)
                            ? "bg-primary/5 border-primary/30"
                            : "bg-muted/20 border-border/30 hover:border-border/50"
                        }`}
                        onClick={() => toggleField(key)}
                      >
                        <Checkbox
                          checked={selectedFields.has(key)}
                          onCheckedChange={() => toggleField(key)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{FIELD_LABELS[key] || key}</span>
                            {isNew && (
                              <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] px-1.5 py-0">NEW</Badge>
                            )}
                            {!isNew && (
                              <Badge className="bg-amber-500/15 text-amber-400 text-[10px] px-1.5 py-0">UPDATE</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {formatFieldValue(key, value)}
                          </p>
                          {!isNew && currentValue && (
                            <p className="text-[11px] text-muted-foreground/60 mt-1">
                              Current: {formatFieldValue(key, currentValue)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    data-testid="button-apply-enrich"
                    className="flex-1 text-primary-foreground"
                    onClick={handleApplyFields}
                    disabled={selectedFields.size === 0 || applyingFields}
                  >
                    {applyingFields ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Apply {selectedFields.size} Field{selectedFields.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No new property data could be extracted from the links.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
