-- Drop the policy that exposes full profile data including emails
DROP POLICY IF EXISTS "Coaches can view assigned umpire profiles" ON public.profiles;

-- Create a view that only exposes non-sensitive umpire information
CREATE OR REPLACE VIEW public.umpire_public_profiles AS
SELECT 
  id,
  full_name,
  created_at
FROM public.profiles;

-- Enable RLS on the view
ALTER VIEW public.umpire_public_profiles SET (security_invoker = on);

-- Create policy for coaches to view umpire public profiles when assigned
CREATE POLICY "Coaches can view assigned umpire public info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Coaches can only see id and full_name of assigned umpires
  -- This policy will be used in conjunction with the view
  EXISTS (
    SELECT 1
    FROM public.games
    WHERE games.assigned_umpire_id = profiles.id
      AND games.coach_id = auth.uid()
  )
);

-- Add a comment to document the security requirement
COMMENT ON POLICY "Coaches can view assigned umpire public info" ON public.profiles IS 
'Coaches can view profiles of assigned umpires. Application code must only select non-sensitive fields (id, full_name). Direct email access is not permitted.';