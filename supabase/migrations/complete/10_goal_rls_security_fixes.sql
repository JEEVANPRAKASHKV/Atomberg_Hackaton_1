-- ── 10_goal_rls_security_fixes.sql ──────────────────────────
-- This migration hardens the Row Level Security (RLS) policies for the Goal module.

-- 1. hr_goal_sheets: Prevent Self-Approval
DROP POLICY IF EXISTS "Employees insert own sheets" ON public.hr_goal_sheets;
CREATE POLICY "Employees insert own sheets"
  ON public.hr_goal_sheets FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id() AND status IN ('draft', 'submitted'));

DROP POLICY IF EXISTS "Employees update own draft sheets" ON public.hr_goal_sheets;
CREATE POLICY "Employees update own draft sheets"
  ON public.hr_goal_sheets FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status IN ('draft','rework'))
  WITH CHECK (employee_id = public.user_employee_id() AND status IN ('draft', 'submitted'));

-- 2. hr_goals: Lock goals from being updated/deleted after sheet approval
DROP POLICY IF EXISTS "Employees update own goals" ON public.hr_goals;
CREATE POLICY "Employees update own goals"
  ON public.hr_goals FOR UPDATE TO authenticated
  USING (
    employee_id = public.user_employee_id() 
    AND EXISTS (
      SELECT 1 FROM public.hr_goal_sheets s 
      WHERE s.id = goal_sheet_id AND s.is_locked = false
    )
  );

DROP POLICY IF EXISTS "Employees delete own goals" ON public.hr_goals;
CREATE POLICY "Employees delete own goals"
  ON public.hr_goals FOR DELETE TO authenticated
  USING (
    employee_id = public.user_employee_id() 
    AND EXISTS (
      SELECT 1 FROM public.hr_goal_sheets s 
      WHERE s.id = goal_sheet_id AND s.is_locked = false
    )
  );

-- 3. hr_goal_checkins: Prevent check-ins before sheet approval
DROP POLICY IF EXISTS "Employees manage own checkins" ON public.hr_goal_checkins;

CREATE POLICY "Employees select own checkins"
  ON public.hr_goal_checkins FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());

CREATE POLICY "Employees insert own checkins"
  ON public.hr_goal_checkins FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.user_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.hr_goals g 
      JOIN public.hr_goal_sheets s ON g.goal_sheet_id = s.id 
      WHERE g.id = goal_id AND s.is_locked = true
    )
  );

CREATE POLICY "Employees update own checkins"
  ON public.hr_goal_checkins FOR UPDATE TO authenticated
  USING (
    employee_id = public.user_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.hr_goals g 
      JOIN public.hr_goal_sheets s ON g.goal_sheet_id = s.id 
      WHERE g.id = goal_id AND s.is_locked = true
    )
  );

CREATE POLICY "Employees delete own checkins"
  ON public.hr_goal_checkins FOR DELETE TO authenticated
  USING (employee_id = public.user_employee_id());
