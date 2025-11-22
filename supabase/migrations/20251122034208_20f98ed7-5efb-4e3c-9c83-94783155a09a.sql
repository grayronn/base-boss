-- Drop and recreate the policies as PERMISSIVE so they OR together
-- This allows umpires to see BOTH unassigned games AND their assigned games

DROP POLICY IF EXISTS "Umpires can view games they are assigned to" ON public.games;
DROP POLICY IF EXISTS "Umpires can view unassigned games" ON public.games;

-- Recreate as PERMISSIVE (this is actually the default but being explicit)
CREATE POLICY "Umpires can view games they are assigned to"
ON public.games
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = assigned_umpire_id);

CREATE POLICY "Umpires can view unassigned games"
ON public.games
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'umpire'::app_role) 
  AND assigned_umpire_id IS NULL 
  AND status = 'pending'
);