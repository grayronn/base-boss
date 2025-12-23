-- Grant admin role to the specified user
INSERT INTO public.user_roles (user_id, role)
VALUES ('27b79b15-b0ee-4d2f-8007-cf8a18b993db', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create policy for admins to manage user_roles (insert new employees)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create policy for admins to delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));