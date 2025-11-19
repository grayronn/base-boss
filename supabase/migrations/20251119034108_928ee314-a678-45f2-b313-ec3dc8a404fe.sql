-- Add coordinates to games table for distance calculations
ALTER TABLE public.games 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add home coordinates to profiles for umpires
ALTER TABLE public.profiles
ADD COLUMN home_latitude DECIMAL(10, 8),
ADD COLUMN home_longitude DECIMAL(11, 8);

-- Create index for faster game queries
CREATE INDEX idx_games_status_date ON public.games(status, game_date);
CREATE INDEX idx_games_assigned_umpire ON public.games(assigned_umpire_id, game_date);