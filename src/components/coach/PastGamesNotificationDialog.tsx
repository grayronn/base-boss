import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Star, Calendar, MapPin, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface PastGame {
  id: string;
  game_date: string;
  location: string;
  opponent: string;
  assigned_umpire_id: string;
  umpire_profile?: {
    full_name: string;
  };
}

interface PastGamesNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: PastGame[];
  onComplete: () => void;
}

const PastGamesNotificationDialog = ({
  open,
  onOpenChange,
  games,
  onComplete,
}: PastGamesNotificationDialogProps) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [noShow, setNoShow] = useState(false);

  const currentGame = games[currentIndex];
  const isLastGame = currentIndex === games.length - 1;
  const totalGames = games.length;

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setNoShow(false);
  };

  const handleConfirmAndRate = async () => {
    if (!user || !currentGame || (!noShow && rating === 0)) {
      toast.error("Please provide a rating or mark as no-show before confirming");
      return;
    }

    const finalRating = noShow ? 0 : rating;

    setLoading(true);
    try {
      // Update game status to completed
      const { error: gameError } = await supabase
        .from("games")
        .update({ status: "completed" })
        .eq("id", currentGame.id);

      if (gameError) throw gameError;

      // Submit the rating
      const { error: ratingError } = await supabase.from("ratings").insert({
        game_id: currentGame.id,
        coach_id: user.id,
        umpire_id: currentGame.assigned_umpire_id,
        rating: finalRating,
        comment: comment || null,
      });

      if (ratingError) {
        // If rating already exists, just continue
        if (ratingError.code !== "23505") {
          throw ratingError;
        }
      }

      toast.success("Game confirmed and rating submitted!");

      if (isLastGame) {
        onOpenChange(false);
        onComplete();
      } else {
        setCurrentIndex((prev) => prev + 1);
        resetForm();
      }
    } catch (error: any) {
      console.error("Error confirming game:", error);
      toast.error("Failed to confirm game. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (isLastGame) {
      onOpenChange(false);
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
      resetForm();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetForm();
    }
  };

  if (!currentGame) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <DialogTitle>Confirm Completed Games</DialogTitle>
          </div>
          <DialogDescription>
            You have {totalGames} past game{totalGames > 1 ? "s" : ""} that need confirmation.
            Please confirm completion and rate the umpire.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {games.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex
                  ? "bg-primary"
                  : index < currentIndex
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Game details */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <h3 className="font-semibold text-lg">vs {currentGame.opponent}</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(new Date(currentGame.game_date), "PPP p")}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {currentGame.location}
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Umpire: {currentGame.umpire_profile?.full_name || "Assigned"}
            </div>
          </div>
        </div>

        {/* Rating section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="noShowPast"
              checked={noShow}
              onCheckedChange={(checked) => {
                setNoShow(checked === true);
                if (checked) setRating(0);
              }}
            />
            <Label htmlFor="noShowPast" className="text-destructive font-medium cursor-pointer">
              Umpire did not show up
            </Label>
          </div>
          {!noShow && (
            <div className="space-y-2">
              <Label>Rate the Umpire's Performance</Label>
              <div className="flex gap-2 justify-center py-2">
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
                      className={`h-10 w-10 ${
                        value <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="comment">{noShow ? "Details (Optional)" : "Comment (Optional)"}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={noShow ? "Provide any additional details about the no-show..." : "Share your feedback about the umpire's performance..."}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {currentIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip {isLastGame ? "& Close" : ""}
              {!isLastGame && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          <Button
            onClick={handleConfirmAndRate}
            disabled={loading || (!noShow && rating === 0)}
            className="w-full sm:w-auto"
          >
            {loading
              ? "Saving..."
              : isLastGame
              ? "Confirm & Finish"
              : "Confirm & Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PastGamesNotificationDialog;
