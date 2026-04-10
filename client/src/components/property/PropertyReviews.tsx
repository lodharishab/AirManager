import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface Review {
  id: number;
  guestName: string;
  rating: number;
  reviewText?: string | null;
  reviewDate: string;
}

interface PropertyReviewsProps {
  reviews: Review[];
}

export function PropertyReviews({ reviews }: PropertyReviewsProps) {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
          <Star className="h-4 w-4" /> Reviews
        </CardTitle>
        <Link href="/reviews">
          <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i <= Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="space-y-3">
              {[...reviews]
                .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime())
                .slice(0, 3)
                .map((review) => (
                  <div key={review.id} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{review.guestName}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.reviewText && (
                      <p className="text-xs text-muted-foreground line-clamp-2">"{review.reviewText}"</p>
                    )}
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(review.reviewDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Star className="mx-auto h-8 w-8 mb-2 opacity-40" />
            No reviews yet for this property
          </div>
        )}
      </CardContent>
    </Card>
  );
}
