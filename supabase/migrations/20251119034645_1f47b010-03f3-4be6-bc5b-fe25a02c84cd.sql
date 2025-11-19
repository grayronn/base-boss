-- Allow umpires to view unassigned games so they can accept them
CREATE POLICY "Umpires can view unassigned games"
ON public.games
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'umpire'::app_role) 
  AND assigned_umpire_id IS NULL 
  AND status = 'pending'
);