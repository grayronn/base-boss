import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, MapPin, Star, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, differenceInHours } from "date-fns";
import RequestUmpireDialog from "@/components/coach/RequestUmpireDialog";
import RateUmpireDialog from "@/components/coach/RateUmpireDialog";
import PastGamesNotificationDialog from "@/components/coach/PastGamesNotificationDialog";
import Navigation from "@/components/Navigation";

interface GameRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Game {
  id: string;
  game_date: string;
  location: string;
  opponent: string;
  status: string;
  assigned_umpire_id: string | null;
  umpire_profile?: {
    full_name: string;
  };
  existing_rating?: GameRating | null;
}

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

const CoachDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [pastGamesDialogOpen, setPastGamesDialogOpen] = useState(false);
  const [pastGamesNeedingConfirmation, setPastGamesNeedingConfirmation] = useState<PastGame[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkCoachRole();
    fetchGames();
    checkPastGames();
  }, [user, navigate]);

  const checkCoachRole = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .eq("role", "coach")
      .single();

    if (error || !data) {
      toast.error("Access denied. Coach role required.");
      navigate("/");
    }
  };

  const checkPastGames = async () => {
    if (!user) return;

    try {
      // Fetch assigned games that are in the past and not completed
      const { data: pastGames, error } = await supabase
        .from("games")
        .select("*")
        .eq("coach_id", user.id)
        .eq("status", "assigned")
        .not("assigned_umpire_id", "is", null)
        .lt("game_date", new Date().toISOString())
        .order("game_date", { ascending: true });

      if (error) throw error;

      if (pastGames && pastGames.length > 0) {
        // Fetch umpire names for these games
        const gamesWithUmpires = await Promise.all(
          pastGames.map(async (game) => {
            const { data: umpireName } = await supabase.rpc(
              "get_assigned_umpire_name",
              { game_id_param: game.id }
            );
            return {
              ...game,
              umpire_profile: umpireName ? { full_name: umpireName } : undefined,
            } as PastGame;
          })
        );

        setPastGamesNeedingConfirmation(gamesWithUmpires);
        setPastGamesDialogOpen(true);
      }
    } catch (error) {
      console.error("Error checking past games:", error);
    }
  };

  const fetchGames = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from("games")
        .select("*")
        .eq("coach_id", user?.id)
        .order("game_date", { ascending: true });

      if (error) throw error;

      // Fetch ratings for completed games
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("id, game_id, rating, comment, created_at")
        .eq("coach_id", user?.id);

      const ratingsMap = new Map(
        (ratingsData || []).map((r) => [r.game_id, r])
      );

      // Fetch umpire names using secure function
      const gamesWithProfiles = await Promise.all(
        (gamesData || []).map(async (game) => {
          let umpireProfile = null;
          if (game.assigned_umpire_id) {
            const { data: umpireName } = await supabase.rpc(
              "get_assigned_umpire_name",
              { game_id_param: game.id }
            );
            umpireProfile = umpireName ? { full_name: umpireName } : null;
          }

          const existingRating = ratingsMap.get(game.id);

          return {
            ...game,
            umpire_profile: umpireProfile,
            existing_rating: existingRating || null,
          };
        })
      );

      setGames(gamesWithProfiles);
    } catch (error) {
      console.error("Error fetching games:", error);
      toast.error("Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleRateUmpire = (game: Game) => {
    setSelectedGame(game);
    setRateDialogOpen(true);
  };

  const canEditRating = (rating: GameRating) => {
    const hoursSinceCreation = differenceInHours(
      new Date(),
      new Date(rating.created_at)
    );
    return hoursSinceCreation < 24;
  };

  // Inline component to display rating or rate button
  const GameRatingDisplay = ({
    game,
    onRate,
  }: {
    game: Game;
    onRate: () => void;
  }) => {
    if (game.existing_rating) {
      const editable = canEditRating(game.existing_rating);
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                className={`h-4 w-4 ${
                  value <= game.existing_rating!.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          {editable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onRate}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit rating (available for 24 hours)</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground ml-1">Rated</span>
          )}
        </div>
      );
    }

    return (
      <Button variant="outline" size="sm" onClick={onRate}>
        <Star className="mr-2 h-4 w-4" />
        Rate Umpire
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Coach Dashboard</h1>
            <p className="text-muted-foreground">Manage your games and umpire assignments</p>
          </div>
          <Button onClick={() => setRequestDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Request Umpire
          </Button>
        </div>

        <div className="grid gap-6">
          {games.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No games scheduled yet. Click "Request Umpire" to add your first game.
                </p>
              </CardContent>
            </Card>
          ) : (
            games.map((game) => (
              <Card key={game.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">vs {game.opponent}</CardTitle>
                      <CardDescription className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(game.game_date), "PPP p")}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {game.location}
                        </div>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(game.status)}>
                      {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      {game.assigned_umpire_id ? (
                        <p className="text-sm text-foreground">
                          <span className="font-semibold">Umpire:</span>{" "}
                          {game.umpire_profile?.full_name || "Assigned"}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No umpire assigned yet</p>
                      )}
                    </div>
                    {game.status === "completed" && game.assigned_umpire_id && (
                      <GameRatingDisplay
                        game={game}
                        onRate={() => handleRateUmpire(game)}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <RequestUmpireDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        onSuccess={fetchGames}
      />

      {selectedGame && (
        <RateUmpireDialog
          open={rateDialogOpen}
          onOpenChange={setRateDialogOpen}
          game={selectedGame}
          onSuccess={() => {
            fetchGames();
            setSelectedGame(null);
          }}
        />
      )}

      <PastGamesNotificationDialog
        open={pastGamesDialogOpen}
        onOpenChange={setPastGamesDialogOpen}
        games={pastGamesNeedingConfirmation}
        onComplete={() => {
          fetchGames();
          setPastGamesNeedingConfirmation([]);
        }}
      />
    </div>
  );
};

export default CoachDashboard;
