-- Allow umpires to accept games by setting themselves as assigned umpire
CREATE POLICY "Umpires can accept unassigned games"
ON public.games
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'umpire'::app_role) 
  AND assigned_umpire_id IS NULL 
  AND status = 'pending'::game_status
)
WITH CHECK (
  has_role(auth.uid(), 'umpire'::app_role)
  AND assigned_umpire_id = auth.uid()
  AND status = 'assigned'::game_status
);