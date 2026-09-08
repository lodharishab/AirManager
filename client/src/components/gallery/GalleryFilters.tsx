import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Filter, Star, X } from "lucide-react";

interface Property {
  id: number;
  name: string;
}

interface GalleryFiltersProps {
  filterProperty: string;
  setFilterProperty: (value: string) => void;
  filterTag: string | null;
  setFilterTag: (value: string | null) => void;
  filterStar: number | null;
  setFilterStar: (value: number | null) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  allTags: string[];
  properties: Property[];
  filteredCount: number;
}

export function GalleryFilters({
  filterProperty, setFilterProperty,
  filterTag, setFilterTag,
  filterStar, setFilterStar,
  searchTerm, setSearchTerm,
  allTags, properties, filteredCount,
}: GalleryFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> Filters:
      </div>

      <Select value={filterProperty} onValueChange={setFilterProperty}>
        <SelectTrigger className="w-[160px] h-8 rounded-lg text-xs">
          <SelectValue placeholder="All Properties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {properties.map(p => (
            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allTags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {allTags.slice(0, 10).map(tag => (
            <Badge
              key={tag}
              variant={filterTag === tag ? "default" : "outline"}
              className={`cursor-pointer text-xs px-2 py-0.5 rounded-full ${
                filterTag === tag ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-0.5 ml-1">
        {[1, 2, 3, 4, 5].map(n => (
          <Star
            key={n}
            className={`h-4 w-4 cursor-pointer transition-colors ${
              filterStar && n <= filterStar ? "fill-primary text-primary" : "text-muted-foreground/30 hover:text-primary/50"
            }`}
            onClick={() => setFilterStar(filterStar === n ? null : n)}
          />
        ))}
      </div>

      {(filterTag || filterStar || filterProperty !== "all" || searchTerm) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setFilterTag(null); setFilterStar(null); setFilterProperty("all"); setSearchTerm(""); }}
        >
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}

      <span className="text-xs text-muted-foreground ml-auto">
        {filteredCount} item{filteredCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
