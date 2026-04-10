import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreatePropertyLink, useDeletePropertyLink } from "@/lib/api";
import { Plus, Trash2, ExternalLink, Link2, Loader2, Wand2 } from "lucide-react";
import { LINK_TYPE_ICONS, LINK_TYPE_OPTIONS } from "./constants";

interface PropertyLink {
  id: number;
  label: string;
  url: string;
  linkType: string;
}

interface PropertyLinksProps {
  propertyId: number;
  links: PropertyLink[];
  onOpenEnrich: () => void;
}

export function PropertyLinks({ propertyId, links, onOpenEnrich }: PropertyLinksProps) {
  const { toast } = useToast();
  const createLink = useCreatePropertyLink();
  const deleteLink = useDeletePropertyLink();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState({ label: "", url: "", linkType: "other" });

  const handleAddLink = () => {
    if (!newLink.label || !newLink.url) {
      toast({ title: "Please fill in label and URL", variant: "destructive" });
      return;
    }
    createLink.mutate(
      { propertyId, ...newLink },
      {
        onSuccess: () => {
          toast({ title: "Link added successfully" });
          setLinkDialogOpen(false);
          setNewLink({ label: "", url: "", linkType: "other" });
        },
      }
    );
  };

  const handleDeleteLink = (linkId: number) => {
    deleteLink.mutate(
      { linkId, propertyId },
      { onSuccess: () => toast({ title: "Link removed" }) }
    );
  };

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="font-serif text-primary text-lg flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Links & Resources
        </CardTitle>
        <div className="flex gap-2">
          {links && links.length > 0 && (
            <Button
              data-testid="button-ai-enrich"
              variant="outline"
              size="sm"
              className="rounded-lg h-8 border-primary/30 text-primary hover:bg-primary/10"
              onClick={onOpenEnrich}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1" /> AI Enrich
            </Button>
          )}
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-link" variant="outline" size="sm" className="rounded-lg h-8">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="font-serif text-primary">Add Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    data-testid="input-link-label"
                    value={newLink.label}
                    onChange={(e) => setNewLink(l => ({ ...l, label: e.target.value }))}
                    placeholder="e.g. Airbnb Listing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    data-testid="input-link-url"
                    value={newLink.url}
                    onChange={(e) => setNewLink(l => ({ ...l, url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newLink.linkType} onValueChange={(v) => setNewLink(l => ({ ...l, linkType: v }))}>
                    <SelectTrigger data-testid="select-link-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINK_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  data-testid="button-submit-link"
                  className="w-full text-primary-foreground"
                  onClick={handleAddLink}
                  disabled={createLink.isPending}
                >
                  {createLink.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {links && links.length > 0 ? (
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} data-testid={`link-item-${link.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 group hover:border-primary/30 transition-colors">
                <span className="text-lg">{LINK_TYPE_ICONS[link.linkType] || "🔗"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{link.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{link.url}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteLink(link.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Link2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
            No links added yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
