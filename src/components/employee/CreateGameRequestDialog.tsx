import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreateGameRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Coach {
  id: string;
  full_name: string | null;
  email: string;
}

const CreateGameRequestDialog = ({ open, onOpenChange, onSuccess }: CreateGameRequestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("18:00");
  const [opponent, setOpponent] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (open) {
      fetchCoaches();
    }
  }, [open]);

  const fetchCoaches = async () => {
    try {
      // Get all users with coach role
      const { data: coachRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "coach");

      if (rolesError) throw rolesError;

      if (coachRoles && coachRoles.length > 0) {
        const coachIds = coachRoles.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", coachIds);

        if (profilesError) throw profilesError;
        setCoaches(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
      toast.error("Failed to load coaches");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoachId || !date) {
      toast.error("Please select a coach and date");
      return;
    }

    setLoading(true);
    try {
      const gameDateTime = new Date(date);
      const [hours, minutes] = time.split(":");
      gameDateTime.setHours(parseInt(hours), parseInt(minutes));

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          coach_id: selectedCoachId,
          game_date: gameDateTime.toISOString(),
          location,
          opponent,
          status: "pending",
        })
        .select()
        .single();

      if (gameError) throw gameError;

      const { error: requestError } = await supabase
        .from("umpire_requests")
        .insert({
          game_id: game.id,
          coach_id: selectedCoachId,
          status: "pending",
        });

      if (requestError) throw requestError;

      toast.success("Game and umpire request created successfully!");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast.error("Failed to create request: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCoachId("");
    setDate(undefined);
    setTime("18:00");
    setOpponent("");
    setLocation("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Game & Umpire Request</DialogTitle>
          <DialogDescription>
            Create a new game on behalf of a coach and request an umpire assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coach">Coach</Label>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.full_name || coach.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opponent">Opponent Team</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Enter opponent team name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter game location"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Game Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Game Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !date || !selectedCoachId}>
              {loading ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGameRequestDialog;
