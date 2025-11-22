import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Calendar, 
  MapPin, 
  Star, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  LogOut,
  MessageSquare,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Game {
  id: string;
  game_date: string;
  location: string;
  opponent: string;
  status: string;
  assigned_umpire_id: string | null;
  coach_id: string;
  coach_profile?: { full_name: string | null; email: string };
  umpire_profile?: { full_name: string | null; email: string };
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  umpire_id: string;
  coach_id: string;
  game_id: string;
  umpire_profile?: { full_name: string | null; email: string };
  coach_profile?: { full_name: string | null; email: string };
  game?: { opponent: string; game_date: string };
}

const EmployeeDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [message, setMessage] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | "low">("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkEmployeeRole();
    fetchData();
  }, [user, navigate]);

  const checkEmployeeRole = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "employee")
      .single();

    if (error || !data) {
      toast.error("Access denied. Employee role required.");
      navigate("/");
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all games with coach and umpire profiles
      const { data: gamesData, error: gamesError } = await supabase
        .from("games")
        .select("*")
        .order("game_date", { ascending: true });

      if (gamesError) throw gamesError;

      // Fetch profiles for coaches and umpires
      const gamesWithProfiles = await Promise.all(
        (gamesData || []).map(async (game) => {
          const gameWithProfiles: Game = { ...game };

          // Fetch coach profile
          const { data: coachProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", game.coach_id)
            .single();
          
          if (coachProfile) {
            gameWithProfiles.coach_profile = coachProfile;
          }

          // Fetch umpire profile if assigned
          if (game.assigned_umpire_id) {
            const { data: umpireProfile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", game.assigned_umpire_id)
              .single();
            
            if (umpireProfile) {
              gameWithProfiles.umpire_profile = umpireProfile;
            }
          }

          return gameWithProfiles;
        })
      );

      setGames(gamesWithProfiles);

      // Fetch all ratings with profiles
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select(`
          *,
          game:games(opponent, game_date)
        `)
        .order("created_at", { ascending: false });

      if (ratingsError) throw ratingsError;

      // Fetch profiles for ratings
      const ratingsWithProfiles = await Promise.all(
        (ratingsData || []).map(async (rating) => {
          const ratingWithProfiles: Rating = { ...rating };

          // Fetch umpire profile
          const { data: umpireProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", rating.umpire_id)
            .single();
          
          if (umpireProfile) {
            ratingWithProfiles.umpire_profile = umpireProfile;
          }

          // Fetch coach profile (reviewer)
          const { data: coachProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", rating.coach_id)
            .single();
          
          if (coachProfile) {
            ratingWithProfiles.coach_profile = coachProfile;
          }

          return ratingWithProfiles;
        })
      );

      setRatings(ratingsWithProfiles);
    } catch (error: any) {
      toast.error("Error loading data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContactReviewer = (rating: Rating) => {
    setSelectedRating(rating);
    setMessage("");
    setMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!selectedRating || !message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    // For now, just show success - in production this would send an email or in-app notification
    toast.success(`Message sent to ${selectedRating.coach_profile?.full_name || "reviewer"}`);
    setMessageDialogOpen(false);
    setMessage("");
    setSelectedRating(null);
  };

  const gamesNeedingUmpire = games.filter(g => !g.assigned_umpire_id && g.status === "pending");
  const totalGames = games.length;
  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : "N/A";
  const lowRatings = ratings.filter(r => r.rating <= 2);

  const filteredRatings = ratingFilter === "low" ? lowRatings : ratings;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Dashboard</h1>
            <p className="text-sm text-muted-foreground">System Management Portal</p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Games</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGames}</div>
              <p className="text-xs text-muted-foreground">All scheduled games</p>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Need Umpire</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{gamesNeedingUmpire.length}</div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageRating}</div>
              <p className="text-xs text-muted-foreground">Overall umpire rating</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Ratings</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{lowRatings.length}</div>
              <p className="text-xs text-muted-foreground">Ratings ≤ 2 stars</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="urgent" className="space-y-4">
          <TabsList>
            <TabsTrigger value="urgent">Urgent Actions</TabsTrigger>
            <TabsTrigger value="all-games">All Games</TabsTrigger>
            <TabsTrigger value="ratings">Ratings & Feedback</TabsTrigger>
          </TabsList>

          {/* Urgent Actions Tab */}
          <TabsContent value="urgent">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Games Requiring Umpire Assignment
                </CardTitle>
                <CardDescription>
                  These games need immediate attention - sorted by date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gamesNeedingUmpire.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    All games have umpires assigned!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {gamesNeedingUmpire.map((game) => (
                      <div key={game.id} className="border border-destructive rounded-lg p-4 bg-destructive/5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{game.opponent}</h3>
                              <Badge variant="destructive">No Umpire</Badge>
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
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Coach: {game.coach_profile?.full_name || "Unknown"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Games Tab */}
          <TabsContent value="all-games">
            <Card>
              <CardHeader>
                <CardTitle>All Games</CardTitle>
                <CardDescription>Complete overview of all scheduled games</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {games.map((game) => (
                    <div key={game.id} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{game.opponent}</h3>
                            <Badge variant={game.assigned_umpire_id ? "default" : "destructive"}>
                              {game.status}
                            </Badge>
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
                            <div>
                              Coach: {game.coach_profile?.full_name || "Unknown"} ({game.coach_profile?.email})
                            </div>
                            {game.assigned_umpire_id && (
                              <div>
                                Umpire: {game.umpire_profile?.full_name || "Unknown"} ({game.umpire_profile?.email})
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Ratings & Feedback</CardTitle>
                    <CardDescription>Monitor umpire ratings and contact reviewers</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant={ratingFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRatingFilter("all")}
                    >
                      All ({ratings.length})
                    </Button>
                    <Button
                      variant={ratingFilter === "low" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRatingFilter("low")}
                    >
                      Low Ratings ({lowRatings.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredRatings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No ratings found</p>
                  ) : (
                    filteredRatings.map((rating) => (
                      <div
                        key={rating.id}
                        className={`border rounded-lg p-4 ${rating.rating <= 2 ? "border-yellow-500 bg-yellow-500/5" : ""}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < rating.rating ? "fill-primary text-primary" : "text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                              {rating.rating <= 2 && (
                                <Badge variant="destructive">Low Rating</Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>
                                <strong>Umpire:</strong> {rating.umpire_profile?.full_name || "Unknown"}
                              </p>
                              <p>
                                <strong>Reviewed by:</strong> {rating.coach_profile?.full_name || "Unknown"} ({rating.coach_profile?.email})
                              </p>
                              <p>
                                <strong>Game:</strong> {rating.game?.opponent} - {rating.game && format(new Date(rating.game.game_date), "PP")}
                              </p>
                              <p className="text-muted-foreground">
                                {format(new Date(rating.created_at), "PPp")}
                              </p>
                              {rating.comment && (
                                <p className="mt-2 text-muted-foreground italic">"{rating.comment}"</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContactReviewer(rating)}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contact Reviewer
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Reviewer</DialogTitle>
            <DialogDescription>
              Send a message to {selectedRating?.coach_profile?.full_name || "the reviewer"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reviewer Email</Label>
              <Input
                value={selectedRating?.coach_profile?.email || ""}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>Send Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeDashboard;