-- ============================================================
-- AtombergHR — Script 6: RLS Update Policy Bug Fixes
-- Run this to fix the RLS violation when submitting goals,
-- work logs, or cancelling leaves.
-- ============================================================

-- 1. Fix hr_goal_sheets
DROP POLICY IF EXISTS "Employees update own draft sheets" ON public.hr_goal_sheets;
CREATE POLICY "Employees update own draft sheets"
  ON public.hr_goal_sheets FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status IN ('draft','rework'))
  WITH CHECK (employee_id = public.user_employee_id());

-- 2. Fix hr_work_log_weeks
DROP POLICY IF EXISTS "Employees update own draft week logs" ON public.hr_work_log_weeks;
CREATE POLICY "Employees update own draft week logs"
  ON public.hr_work_log_weeks FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status IN ('Draft','Rework'))
  WITH CHECK (employee_id = public.user_employee_id());

-- 3. Fix hr_work_log_tasks
DROP POLICY IF EXISTS "Employees update own draft tasks" ON public.hr_work_log_tasks;
CREATE POLICY "Employees update own draft tasks"
  ON public.hr_work_log_tasks FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND day_status IN ('Draft','Rework'))
  WITH CHECK (employee_id = public.user_employee_id());

-- 4. Fix hr_leaves
DROP POLICY IF EXISTS "Employees can cancel own pending leaves" ON public.hr_leaves;
CREATE POLICY "Employees can cancel own pending leaves"
  ON public.hr_leaves FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status = 'Pending')
  WITH CHECK (employee_id = public.user_employee_id());
