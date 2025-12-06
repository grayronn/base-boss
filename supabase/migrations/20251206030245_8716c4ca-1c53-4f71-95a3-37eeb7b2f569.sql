-- Create table to store external umpire leads from coaches
CREATE TABLE public.external_umpire_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  umpire_name TEXT NOT NULL,
  umpire_contact TEXT,
  how_found TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_umpire_leads ENABLE ROW LEVEL SECURITY;

-- Coaches can create leads for their own games
CREATE POLICY "Coaches can create their own leads"
ON public.external_umpire_leads
FOR INSERT
WITH CHECK (auth.uid() = coach_id);

-- Coaches can view their own leads
CREATE POLICY "Coaches can view their own leads"
ON public.external_umpire_leads
FOR SELECT
USING (auth.uid() = coach_id);

-- Employees can view all leads
CREATE POLICY "Employees can view all leads"
ON public.external_umpire_leads
FOR SELECT
USING (has_role(auth.uid(), 'employee'::app_role));

-- Employees can manage all leads
CREATE POLICY "Employees can manage all leads"
ON public.external_umpire_leads
FOR ALL
USING (has_role(auth.uid(), 'employee'::app_role));