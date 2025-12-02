import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import RequestUmpireDialog from "@/components/coach/RequestUmpireDialog";
import RateUmpireDialog from "@/components/coach/RateUmpireDialog";
import Navigation from "@/components/Navigation";

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
}

const CoachDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkCoachRole();
    fetchGames();
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

  const fetchGames = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from("games")
        .select("*")
        .eq("coach_id", user?.id)
        .order("game_date", { ascending: true });

      if (error) throw error;

      // Fetch umpire names using secure function
      const gamesWithProfiles = await Promise.all(
        (gamesData || []).map(async (game) => {
          if (game.assigned_umpire_id) {
            const { data: umpireName } = await supabase
              .rpc("get_assigned_umpire_name", { game_id_param: game.id });
            
            return { 
              ...game, 
              umpire_profile: umpireName ? { full_name: umpireName } : null 
            };
          }
          return game;
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRateUmpire(game)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Rate Umpire
                      </Button>
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
    </div>
  );
};

export default CoachDashboard;
