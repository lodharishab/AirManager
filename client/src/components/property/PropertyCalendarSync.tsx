import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useToast } from "@/hooks/use-toast";
import { useGenerateIcalToken, useImportCalendar, useDeleteExternalCalendar } from "@/lib/api";
import { CalendarSync, Copy, Link2, Loader2, Trash2, ExternalLink } from "lucide-react";
import type { ExternalCalendar } from "@shared/schema";

interface PropertyCalendarSyncProps {
  propertyId: number;
  icalToken: string | null;
  externalCalendars: ExternalCalendar[];
}

export function PropertyCalendarSync({ propertyId, icalToken, externalCalendars }: PropertyCalendarSyncProps) {
  const { toast } = useToast();
  const generateToken = useGenerateIcalToken();
  const importCalendar = useImportCalendar();
  const deleteCalendar = useDeleteExternalCalendar();
  const [importUrl, setImportUrl] = useState("");
  const [importName, setImportName] = useState("");

  const feedUrl = icalToken
    ? `${window.location.origin}/api/properties/${propertyId}/calendar.ics?token=${icalToken}`
    : null;

  const handleGenerateToken = () => {
    generateToken.mutate(propertyId, {
      onSuccess: () => {
        toast({ title: "iCal feed URL generated" });
      },
      onError: (err: Error) => {
        toast({ title: "Failed to generate feed URL", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleCopyUrl = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast({ title: "Feed URL copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy URL", variant: "destructive" });
    }
  };

  const handleImport = () => {
    if (!importUrl.trim()) return;
    importCalendar.mutate(
      { propertyId, url: importUrl.trim(), name: importName.trim() || undefined },
      {
        onSuccess: (data) => {
          toast({ title: `Imported ${data.imported} of ${data.total} events` });
          setImportUrl("");
          setImportName("");
        },
        onError: (err: Error) => {
          toast({ title: "Import failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteCalendar = (calId: number) => {
    deleteCalendar.mutate(
      { calendarId: calId, propertyId },
      {
        onSuccess: () => {
          toast({ title: "External calendar removed" });
        },
      }
    );
  };

  return (
    <Card className="rounded-2xl border-border/50" data-testid="card-calendar-sync">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
          <CalendarSync className="h-4 w-4" /> Calendar Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <h4 className="text-sm font-medium mb-2">iCal Feed URL</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Share this URL with Airbnb, Booking.com, Google Calendar, or other platforms to export your availability.
          </p>
          {feedUrl ? (
            <div className="flex gap-2">
              <Input
                readOnly
                value={feedUrl}
                className="text-xs font-mono"
                data-testid="input-ical-feed-url"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                data-testid="button-copy-ical-url"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateToken}
              disabled={generateToken.isPending}
              data-testid="button-generate-ical-token"
            >
              {generateToken.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Generate Feed URL
            </Button>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">Import External Calendar</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Paste an iCal URL from another platform to import blocked dates.
          </p>
          <div className="space-y-2">
            <Input
              placeholder="iCal URL (https://...)"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              data-testid="input-import-calendar-url"
            />
            <Input
              placeholder="Calendar name (optional)"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              data-testid="input-import-calendar-name"
            />
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!importUrl.trim() || importCalendar.isPending}
              data-testid="button-import-calendar"
            >
              {importCalendar.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Link2 className="h-4 w-4 mr-2" />
              Import Calendar
            </Button>
          </div>
        </div>

        {externalCalendars.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Connected Calendars</h4>
            <div className="space-y-2">
              {externalCalendars.map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30"
                  data-testid={`row-external-calendar-${cal.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{cal.name}</div>
                      {cal.lastSyncedAt && (
                        <div className="text-xs text-muted-foreground">
                          Last synced: {new Date(cal.lastSyncedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => handleDeleteCalendar(cal.id)}
                    data-testid={`button-delete-calendar-${cal.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
