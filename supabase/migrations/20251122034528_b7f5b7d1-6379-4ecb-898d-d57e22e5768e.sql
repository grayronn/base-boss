-- Fix SELECT RLS policies on games so non-coach/employee roles (like umpires) aren't blocked

-- Drop existing SELECT-related policies
DROP POLICY IF EXISTS "Coaches can view their own games" ON public.games;
DROP POLICY IF EXISTS "Employees can view all games" ON public.games;
DROP POLICY IF EXISTS "Employees can manage all games" ON public.games;

-- Recreate policies as PERMISSIVE so they OR together with umpire policies
CREATE POLICY "Coaches can view their own games"
ON public.games
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = coach_id);

CREATE POLICY "Employees can manage all games"
ON public.games
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can view all games"
ON public.games
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));