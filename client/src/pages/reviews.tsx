import { useState, useMemo } from "react";
import { useReviews, useProperties, useCreateReview, useUpdateReview, useDeleteReview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageSquareText,
  TrendingUp,
  BarChart3,
  Filter,
} from "lucide-react";
import type { Review } from "@shared/schema";

const PLATFORM_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  google: "Google",
  direct: "Direct",
  other: "Other",
};

const PLATFORM_COLORS: Record<string, string> = {
  airbnb: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  booking: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  google: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  direct: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  other: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const starSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${starSize} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="p-0.5 hover:scale-110 transition-transform"
          data-testid={`star-input-${i}`}
        >
          <Star
            className={`h-6 w-6 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-400/50"}`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingDistribution({ reviews }: { reviews: Review[] }) {
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((count, i) => ({ stars: i + 1, count, pct: (count / max) * 100 })).reverse();
  }, [reviews]);

  return (
    <div className="space-y-2">
      {distribution.map((d) => (
        <div key={d.stars} className="flex items-center gap-2 text-sm">
          <span className="w-3 text-right text-muted-foreground">{d.stars}</span>
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${d.pct}%` }}
            />
          </div>
          <span className="w-6 text-right text-muted-foreground text-xs">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { data: reviews = [], isLoading } = useReviews();
  const { data: properties = [] } = useProperties();
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const deleteReview = useDeleteReview();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");

  const [formData, setFormData] = useState({
    propertyId: 0,
    guestName: "",
    platform: "direct",
    rating: 5,
    reviewText: "",
    responseText: "",
    reviewDate: new Date().toISOString().split("T")[0],
  });

  const propertyMap = useMemo(() => {
    const map: Record<number, string> = {};
    properties.forEach((p) => (map[p.id] = p.name));
    return map;
  }, [properties]);

  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => filterProperty === "all" || r.propertyId === Number(filterProperty))
      .filter((r) => filterPlatform === "all" || r.platform === filterPlatform)
      .filter((r) => filterRating === "all" || r.rating === Number(filterRating))
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }, [reviews, filterProperty, filterPlatform, filterRating]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const resetForm = () => {
    setFormData({
      propertyId: 0,
      guestName: "",
      platform: "direct",
      rating: 5,
      reviewText: "",
      responseText: "",
      reviewDate: new Date().toISOString().split("T")[0],
    });
  };

  const handleCreate = () => {
    if (!formData.propertyId || !formData.guestName) {
      toast({ title: "Please fill in property and guest name", variant: "destructive" });
      return;
    }
    createReview.mutate(
      {
        ...formData,
        reviewDate: new Date(formData.reviewDate).toISOString(),
        responseText: formData.responseText || null,
        reviewText: formData.reviewText || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Review added successfully" });
          setCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleEdit = () => {
    if (!editingReview) return;
    updateReview.mutate(
      {
        id: editingReview.id,
        ...formData,
        reviewDate: new Date(formData.reviewDate).toISOString(),
        responseText: formData.responseText || null,
        reviewText: formData.reviewText || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Review updated" });
          setEditDialogOpen(false);
          setEditingReview(null);
          resetForm();
        },
      }
    );
  };

  const openEdit = (review: Review) => {
    setEditingReview(review);
    setFormData({
      propertyId: review.propertyId,
      guestName: review.guestName,
      platform: review.platform,
      rating: review.rating,
      reviewText: review.reviewText || "",
      responseText: review.responseText || "",
      reviewDate: review.reviewDate ? new Date(review.reviewDate).toISOString().split("T")[0] : "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteReview.mutate(id, {
      onSuccess: () => toast({ title: "Review deleted" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const reviewForm = (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Property</Label>
        <Select
          value={formData.propertyId ? String(formData.propertyId) : ""}
          onValueChange={(v) => setFormData((d) => ({ ...d, propertyId: Number(v) }))}
        >
          <SelectTrigger data-testid="select-review-property">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Guest Name</Label>
          <Input
            data-testid="input-review-guest"
            value={formData.guestName}
            onChange={(e) => setFormData((d) => ({ ...d, guestName: e.target.value }))}
            placeholder="Guest name"
          />
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select
            value={formData.platform}
            onValueChange={(v) => setFormData((d) => ({ ...d, platform: v }))}
          >
            <SelectTrigger data-testid="select-review-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="airbnb">Airbnb</SelectItem>
              <SelectItem value="booking">Booking.com</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rating</Label>
          <StarRatingInput
            value={formData.rating}
            onChange={(v) => setFormData((d) => ({ ...d, rating: v }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            data-testid="input-review-date"
            type="date"
            value={formData.reviewDate}
            onChange={(e) => setFormData((d) => ({ ...d, reviewDate: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Review Text</Label>
        <Textarea
          data-testid="input-review-text"
          rows={3}
          value={formData.reviewText}
          onChange={(e) => setFormData((d) => ({ ...d, reviewText: e.target.value }))}
          placeholder="Guest review text..."
        />
      </div>
      <div className="space-y-2">
        <Label>Response (optional)</Label>
        <Textarea
          data-testid="input-review-response"
          rows={2}
          value={formData.responseText}
          onChange={(e) => setFormData((d) => ({ ...d, responseText: e.target.value }))}
          placeholder="Your response to the review..."
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-testid="text-reviews-title" className="text-3xl font-bold tracking-tight font-serif text-primary">
            Reviews
          </h1>
          <p className="text-muted-foreground mt-1">Track guest reviews across all platforms</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-review" className="text-primary-foreground rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Add Review
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-primary">Add Review</DialogTitle>
            </DialogHeader>
            {reviewForm}
            <Button
              data-testid="button-submit-review"
              className="w-full text-primary-foreground"
              onClick={handleCreate}
              disabled={createReview.isPending}
            >
              {createReview.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Review
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Average Rating</div>
              <div data-testid="text-average-rating" className="text-2xl font-bold flex items-center gap-2">
                {averageRating.toFixed(1)}
                <StarRating rating={Math.round(averageRating)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <MessageSquareText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Reviews</div>
              <div data-testid="text-total-reviews" className="text-2xl font-bold">{reviews.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Distribution</span>
            </div>
            <RatingDistribution reviews={reviews} />
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger data-testid="filter-property" className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger data-testid="filter-platform" className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger data-testid="filter-rating" className="w-[120px] h-9 text-sm">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card className="rounded-2xl border-border/50">
            <CardContent className="py-12 text-center">
              <MessageSquareText className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-lg">No reviews found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {reviews.length === 0
                  ? "Add your first review to start tracking guest feedback."
                  : "Try adjusting your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id} data-testid={`card-review-${review.id}`} className="rounded-2xl border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span data-testid={`text-review-guest-${review.id}`} className="font-semibold">{review.guestName}</span>
                      <Badge className={`${PLATFORM_COLORS[review.platform]} border text-xs`}>
                        {PLATFORM_LABELS[review.platform] || review.platform}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {propertyMap[review.propertyId] || `Property #${review.propertyId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.reviewDate).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {review.reviewText && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        "{review.reviewText}"
                      </p>
                    )}
                    {review.responseText && (
                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mt-2">
                        <div className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Host Response
                        </div>
                        <p className="text-sm text-muted-foreground">{review.responseText}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      data-testid={`button-edit-review-${review.id}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(review)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      data-testid={`button-delete-review-${review.id}`}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingReview(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-primary">Edit Review</DialogTitle>
          </DialogHeader>
          {reviewForm}
          <Button
            data-testid="button-save-review"
            className="w-full text-primary-foreground"
            onClick={handleEdit}
            disabled={updateReview.isPending}
          >
            {updateReview.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
