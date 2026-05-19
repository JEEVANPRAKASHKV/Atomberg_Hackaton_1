-- Drop existing SELECT policies for hr_appreciations
DROP POLICY IF EXISTS "view_own_appreciations" ON public.hr_appreciations;
DROP POLICY IF EXISTS "view_public_appreciations" ON public.hr_appreciations;

-- Create new policy: Admins can view ALL appreciations
CREATE POLICY "admin_view_all_appreciations" ON public.hr_appreciations
FOR SELECT
USING (public.user_role() = 'Admin');

-- Create new policy: Users can view public appreciations
CREATE POLICY "view_public_appreciations" ON public.hr_appreciations
FOR SELECT
USING (is_public = true);

-- Create new policy: Users can view appreciations they sent or received
CREATE POLICY "view_own_appreciations" ON public.hr_appreciations
FOR SELECT
USING (
  (to_employee_id IN (SELECT id FROM hr_employees WHERE user_id = auth.uid()))
  OR 
  (from_employee_id IN (SELECT id FROM hr_employees WHERE user_id = auth.uid()))
);

-- Create new policy: Managers can view team appreciations for their team
CREATE POLICY "manager_view_team_appreciations" ON public.hr_appreciations
FOR SELECT
USING (
  public.user_role() = 'Manager' 
  AND visible_to_team IS NOT NULL 
  AND visible_to_team != 'Private'
);