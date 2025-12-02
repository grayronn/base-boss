-- The previous approach still exposed email addresses because RLS policies grant row-level access.
-- We need to completely prevent coaches from accessing the profiles table directly.

-- Drop the policy that still allows profile access
DROP POLICY IF EXISTS "Coaches can view assigned umpire public info" ON public.profiles;

-- Create a secure function that returns only public umpire info for assigned games
CREATE OR REPLACE FUNCTION public.get_assigned_umpire_name(game_id_param uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  umpire_name TEXT;
  requesting_coach_id UUID;
BEGIN
  -- Get the coach_id and assigned_umpire_id for this game
  SELECT coach_id, assigned_umpire_id INTO requesting_coach_id, umpire_name
  FROM games
  WHERE id = game_id_param;
  
  -- Check if the requesting user is the coach for this game
  IF requesting_coach_id != auth.uid() THEN
    RETURN NULL;
  END IF;
  
  -- Return only the umpire's full name
  SELECT full_name INTO umpire_name
  FROM profiles
  WHERE id = (SELECT assigned_umpire_id FROM games WHERE id = game_id_param);
  
  RETURN umpire_name;
END;
$$;