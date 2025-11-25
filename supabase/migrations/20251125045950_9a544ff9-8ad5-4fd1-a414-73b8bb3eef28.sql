-- Allow coaches to view profiles of umpires assigned to their games
CREATE POLICY "Coaches can view assigned umpire profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.games
    WHERE games.assigned_umpire_id = profiles.id
      AND games.coach_id = auth.uid()
  )
);