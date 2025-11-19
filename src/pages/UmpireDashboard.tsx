import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, MapPin, Star, TrendingUp, LogOut, Filter } from "lucide-react";
import { format } from "date-fns";

interface Game {
  id: string;
  game_date: string;
  location: string;
  opponent: string;
  latitude: number | null;
  longitude: number | null;
  coach_id: string;
  assigned_umpire_id: string | null;
}

interface Rating {
  rating: number;
  comment: string | null;
  created_at: string;
  games: {
    opponent: string;
    game_date: string;
  };
}

const UmpireDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch user's home coordinates
      const { data: profile } = await supabase
        .from("profiles")
        .select("home_latitude, home_longitude")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserLat(profile.home_latitude);
        setUserLng(profile.home_longitude);
      }

      // Fetch available games (pending requests without assigned umpire)
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select(`
          id,
          game_date,
          location,
          opponent,
          latitude,
          longitude,
          coach_id,
          assigned_umpire_id
        `)
        .is("assigned_umpire_id", null)
        .eq("status", "pending")
        .gte("game_date", new Date().toISOString())
        .order("game_date", { ascending: true });

      if (gamesError) throw gamesError;
      setAvailableGames(gamesData || []);

      // Fetch umpire's assigned games
      const { data: myGamesData, error: myGamesError } = await supabase
        .from("games")
        .select(`
          id,
          game_date,
          location,
          opponent,
          latitude,
          longitude,
          coach_id,
          assigned_umpire_id
        `)
        .eq("assigned_umpire_id", user.id)
        .order("game_date", { ascending: true });

      if (myGamesError) throw myGamesError;
      setMyGames(myGamesData || []);

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select(`
          rating,
          comment,
          created_at,
          games (opponent, game_date)
        `)
        .eq("umpire_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);
    } catch (error: any) {
      toast.error("Error loading data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const checkDoubleBooking = (gameDate: string, gameLat: number | null, gameLng: number | null): boolean => {
    const newGameTime = new Date(gameDate).getTime();
    const twoHours = 2 * 60 * 60 * 1000;

    for (const game of myGames) {
      const existingGameTime = new Date(game.game_date).getTime();
      const timeDiff = Math.abs(newGameTime - existingGameTime);

      // Check if games are at the same time
      if (timeDiff < twoHours) {
        // If at different locations, calculate travel time consideration
        if (gameLat && gameLng && game.latitude && game.longitude) {
          const distance = calculateDistance(gameLat, gameLng, game.latitude, game.longitude);
          // Assume 30 miles per hour average travel speed
          const travelTimeMinutes = (distance / 30) * 60;
          const requiredBuffer = (travelTimeMinutes + 60) * 60 * 1000; // Add 1 hour buffer

          if (timeDiff < requiredBuffer) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
    return false;
  };

  const handleAcceptGame = async (gameId: string, gameDate: string, gameLat: number | null, gameLng: number | null) => {
    if (!user) return;

    if (checkDoubleBooking(gameDate, gameLat, gameLng)) {
      toast.error("Cannot accept: This game conflicts with your existing schedule (including travel time)");
      return;
    }

    try {
      const { error } = await supabase
        .from("games")
        .update({ assigned_umpire_id: user.id, status: "assigned" })
        .eq("id", gameId);

      if (error) throw error;

      // Update umpire_request status
      await supabase
        .from("umpire_requests")
        .update({ status: "accepted" })
        .eq("game_id", gameId);

      toast.success("Game accepted successfully!");
      fetchData();
    } catch (error: any) {
      toast.error("Error accepting game: " + error.message);
    }
  };

  const filteredGames = availableGames.filter(game => {
    if (!userLat || !userLng || !game.latitude || !game.longitude) {
      return true; // Show all games if coordinates not available
    }
    const distance = calculateDistance(userLat, userLng, game.latitude, game.longitude);
    return distance <= maxDistance;
  });

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : "N/A";

  const totalGames = myGames.length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Umpire Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGames}</div>
              <p className="text-xs text-muted-foreground">Games umpired</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageRating}</div>
              <p className="text-xs text-muted-foreground">Out of 5 stars</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ratings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ratings.length}</div>
              <p className="text-xs text-muted-foreground">Feedback received</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Games */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Available Games</CardTitle>
                <CardDescription>Select games to umpire</CardDescription>
              </div>
              {userLat && userLng && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="distance" className="text-sm">Max distance (miles):</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="w-20"
                    min="1"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredGames.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No available games at this time</p>
            ) : (
              <div className="space-y-4">
                {filteredGames.map((game) => {
                  const distance = userLat && userLng && game.latitude && game.longitude
                    ? calculateDistance(userLat, userLng, game.latitude, game.longitude)
                    : null;

                  return (
                    <div key={game.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{game.opponent}</h3>
                            <Badge variant="outline">Available</Badge>
                          </div>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(game.game_date), "PPp")}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {game.location}
                              {distance && ` (${distance.toFixed(1)} miles away)`}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAcceptGame(game.id, game.game_date, game.latitude, game.longitude)}
                        >
                          Accept Game
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Games */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Scheduled Games</CardTitle>
            <CardDescription>Games you're assigned to umpire</CardDescription>
          </CardHeader>
          <CardContent>
            {myGames.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No scheduled games</p>
            ) : (
              <div className="space-y-4">
                {myGames.map((game) => (
                  <div key={game.id} className="border rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{game.opponent}</h3>
                        <Badge>Confirmed</Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(game.game_date), "PPp")}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {game.location}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>My Ratings</CardTitle>
            <CardDescription>Recent feedback from coaches</CardDescription>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No ratings yet</p>
            ) : (
              <div className="space-y-4">
                {ratings.map((rating, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < rating.rating ? "fill-primary text-primary" : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm font-medium">{rating.games.opponent}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(rating.games.game_date), "PP")}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(rating.created_at), "PP")}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-muted-foreground mt-2">{rating.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UmpireDashboard;