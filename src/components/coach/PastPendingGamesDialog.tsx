import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";

interface PastPendingGame {
  id: string;
  game_date: string;
  location: string;
  opponent: string;
}

interface PastPendingGamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: PastPendingGame[];
  onComplete: () => void;
}

const HOW_FOUND_OPTIONS = [
  { value: "personal_contact", label: "Personal Contact" },
  { value: "referral", label: "Referral from another coach" },
  { value: "league_connection", label: "League/Association Connection" },
  { value: "social_media", label: "Social Media" },
  { value: "local_board", label: "Local Umpire Board/Registry" },
  { value: "other", label: "Other" },
];

const PastPendingGamesDialog = ({
  open,
  onOpenChange,
  games,
  onComplete,
}: PastPendingGamesDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameCompleted, setGameCompleted] = useState<boolean | null>(null);
  const [umpireName, setUmpireName] = useState("");
  const [umpireContact, setUmpireContact] = useState("");
  const [howFound, setHowFound] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentGame = games[currentIndex];
  const isLastGame = currentIndex === games.length - 1;

  const resetForm = () => {
    setGameCompleted(null);
    setUmpireName("");
    setUmpireContact("");
    setHowFound("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!currentGame) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (gameCompleted) {
        // Save external umpire lead
        const { error: leadError } = await supabase
          .from("external_umpire_leads")
          .insert({
            game_id: currentGame.id,
            coach_id: user.id,
            umpire_name: umpireName.trim(),
            umpire_contact: umpireContact.trim() || null,
            how_found: howFound,
            notes: notes.trim() || null,
          });

        if (leadError) throw leadError;

        // Mark game as completed
        const { error: gameError } = await supabase
          .from("games")
          .update({ status: "completed" })
          .eq("id", currentGame.id);

        if (gameError) throw gameError;

        toast.success("Game information saved!");
      } else {
        // Mark game as cancelled if it didn't happen
        const { error: gameError } = await supabase
          .from("games")
          .update({ status: "cancelled" })
          .eq("id", currentGame.id);

        if (gameError) throw gameError;

        toast.success("Game marked as cancelled");
      }

      if (isLastGame) {
        onOpenChange(false);
        onComplete();
      } else {
        resetForm();
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      console.error("Error saving game info:", error);
      toast.error("Failed to save game information");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (isLastGame) {
      onOpenChange(false);
      onComplete();
    } else {
      resetForm();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const canSubmit = () => {
    if (gameCompleted === null) return false;
    if (gameCompleted === false) return true;
    return umpireName.trim().length > 0 && howFound.length > 0;
  };

  if (!currentGame) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Past Game Update</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentIndex + 1} of {games.length}
            </span>
          </DialogTitle>
          <DialogDescription>
            This game was scheduled but had no umpire assigned through our platform. Please let us know what happened.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Game Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="font-semibold">vs {currentGame.opponent}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(currentGame.game_date), "PPP p")}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {currentGame.location}
            </div>
          </div>

          {/* Was the game completed? */}
          <div className="space-y-2">
            <Label>Was this game completed?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={gameCompleted === true ? "default" : "outline"}
                className="flex-1"
                onClick={() => setGameCompleted(true)}
              >
                Yes, it was played
              </Button>
              <Button
                type="button"
                variant={gameCompleted === false ? "default" : "outline"}
                className="flex-1"
                onClick={() => setGameCompleted(false)}
              >
                No, it was cancelled
              </Button>
            </div>
          </div>

          {/* External umpire details (only if game was completed) */}
          {gameCompleted === true && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="umpireName">Who umpired the game? *</Label>
                <Input
                  id="umpireName"
                  value={umpireName}
                  onChange={(e) => setUmpireName(e.target.value)}
                  placeholder="Enter umpire's name"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="umpireContact">Umpire's contact info (optional)</Label>
                <Input
                  id="umpireContact"
                  value={umpireContact}
                  onChange={(e) => setUmpireContact(e.target.value)}
                  placeholder="Email or phone number"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="howFound">How did you find this umpire? *</Label>
                <Select value={howFound} onValueChange={setHowFound}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOW_FOUND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about this umpire..."
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetForm();
                  setCurrentIndex(currentIndex - 1);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip
              {!isLastGame && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || submitting}
            >
              {submitting ? "Saving..." : isLastGame ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PastPendingGamesDialog;
