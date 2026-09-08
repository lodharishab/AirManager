import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, MapPin, Sparkles, Shield } from "lucide-react";
import { AMENITY_ICONS } from "./constants";

interface PropertyAboutProps {
  property: {
    internalNotes?: string | null;
    description?: string | null;
    neighborhood?: string | null;
    amenities?: string[] | null;
    houseRules?: string | null;
  };
}

export function PropertyAbout({ property }: PropertyAboutProps) {
  return (
    <>
      {property.internalNotes && <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Internal notes — pending verification</summary><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{property.internalNotes}</p></details>}
      {property.description && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> About This Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{property.description}</p>
            {property.neighborhood && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Neighbourhood:</span>
                <span className="font-medium">{property.neighborhood}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {property.amenities && property.amenities.length > 0 && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Amenities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {property.amenities.map((amenity) => (
                <div key={amenity} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/30">
                  <span className="text-primary">
                    {AMENITY_ICONS[amenity] || <Sparkles className="h-4 w-4" />}
                  </span>
                  <span className="text-sm font-medium">{amenity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {property.houseRules && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" /> House Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.houseRules}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
