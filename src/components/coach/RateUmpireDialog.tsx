import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface ExistingRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface RateUmpireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: {
    id: string;
    assigned_umpire_id: string | null;
    umpire_profile?: {
      full_name: string;
    };
    existing_rating?: ExistingRating | null;
  };
  onSuccess: () => void;
}

const RateUmpireDialog = ({ open, onOpenChange, game, onSuccess }: RateUmpireDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [noShow, setNoShow] = useState(false);

  const isEditing = !!game.existing_rating;

  // Pre-fill form when editing
  useEffect(() => {
    if (open && game.existing_rating) {
      setRating(game.existing_rating.rating);
      setComment(game.existing_rating.comment || "");
      setNoShow(game.existing_rating.rating === 0);
    } else if (open) {
      resetForm();
    }
  }, [open, game.existing_rating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !game.assigned_umpire_id || (!noShow && rating === 0)) return;

    const finalRating = noShow ? 0 : rating;
    
    setLoading(true);
    try {
      if (isEditing && game.existing_rating) {
        // Update existing rating
        const { error } = await supabase
          .from("ratings")
          .update({
            rating: finalRating,
            comment: comment || null,
          })
          .eq("id", game.existing_rating.id);

        if (error) throw error;
        toast.success("Rating updated successfully!");
      } else {
        // Insert new rating
        const { error } = await supabase
          .from("ratings")
          .insert({
            game_id: game.id,
            coach_id: user.id,
            umpire_id: game.assigned_umpire_id,
            rating: finalRating,
            comment: comment || null,
          });

        if (error) throw error;
        toast.success("Rating submitted successfully!");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      if (error.code === "23505") {
        toast.error("You have already rated this umpire for this game");
      } else {
        toast.error("Failed to submit rating");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setNoShow(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Rating" : "Rate Umpire"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update your rating for" : "Rate the performance of"}{" "}
            {game.umpire_profile?.full_name || "the umpire"} for this game.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="noShow"
                checked={noShow}
                onCheckedChange={(checked) => {
                  setNoShow(checked === true);
                  if (checked) setRating(0);
                }}
              />
              <Label htmlFor="noShow" className="text-destructive font-medium cursor-pointer">
                Umpire did not show up
              </Label>
            </div>
            {!noShow && (
              <div className="grid gap-3">
                <Label>Rating</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          value <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-3">
              <Label htmlFor="comment">{noShow ? "Details (Optional)" : "Comment (Optional)"}</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={noShow ? "Provide any additional details about the no-show..." : "Share your feedback about the umpire's performance..."}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (!noShow && rating === 0)}>
              {loading ? "Saving..." : isEditing ? "Update Rating" : "Submit Rating"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RateUmpireDialog;
