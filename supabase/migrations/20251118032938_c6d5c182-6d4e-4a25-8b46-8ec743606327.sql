-- Create enum for game status
CREATE TYPE public.game_status AS ENUM ('pending', 'assigned', 'completed', 'cancelled');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  opponent TEXT NOT NULL,
  status game_status NOT NULL DEFAULT 'pending',
  assigned_umpire_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create umpire_requests table
CREATE TABLE public.umpire_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  umpire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, coach_id)
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umpire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games table
CREATE POLICY "Coaches can view their own games"
  ON public.games FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create their own games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Umpires can view games they are assigned to"
  ON public.games FOR SELECT
  USING (auth.uid() = assigned_umpire_id);

CREATE POLICY "Employees can view all games"
  ON public.games FOR SELECT
  USING (has_role(auth.uid(), 'employee'));

CREATE POLICY "Employees can manage all games"
  ON public.games FOR ALL
  USING (has_role(auth.uid(), 'employee'));

-- RLS Policies for umpire_requests table
CREATE POLICY "Coaches can view their own requests"
  ON public.umpire_requests FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create their own requests"
  ON public.umpire_requests FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Umpires can view all requests"
  ON public.umpire_requests FOR SELECT
  USING (has_role(auth.uid(), 'umpire'));

CREATE POLICY "Employees can manage all requests"
  ON public.umpire_requests FOR ALL
  USING (has_role(auth.uid(), 'employee'));

-- RLS Policies for ratings table
CREATE POLICY "Coaches can view their own ratings"
  ON public.ratings FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create ratings for completed games"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = coach_id AND
    EXISTS (
      SELECT 1 FROM public.games 
      WHERE id = game_id 
      AND coach_id = auth.uid() 
      AND status = 'completed'
    )
  );

CREATE POLICY "Umpires can view ratings about them"
  ON public.ratings FOR SELECT
  USING (auth.uid() = umpire_id);

CREATE POLICY "Employees can view all ratings"
  ON public.ratings FOR SELECT
  USING (has_role(auth.uid(), 'employee'));

-- Triggers for updated_at
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_umpire_requests_updated_at
  BEFORE UPDATE ON public.umpire_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();