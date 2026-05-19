-- ============================================================
-- AtombergHR — Script 2: Work Log Schema
-- Run this SECOND in Supabase SQL Editor
-- ============================================================

-- ── Table 18: hr_work_log_weeks ──────────────────────────────
CREATE TABLE public.hr_work_log_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Approved','Rework')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.hr_employees(id),
  approved_at TIMESTAMPTZ,
  rework_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

CREATE INDEX idx_work_log_weeks_employee_date ON public.hr_work_log_weeks(employee_id, week_start_date);
CREATE INDEX idx_work_log_weeks_status ON public.hr_work_log_weeks(status);

ALTER TABLE public.hr_work_log_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own week logs"
  ON public.hr_work_log_weeks FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees insert own week logs"
  ON public.hr_work_log_weeks FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own draft week logs"
  ON public.hr_work_log_weeks FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status IN ('Draft','Rework'));
CREATE POLICY "Managers view team week logs"
  ON public.hr_work_log_weeks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM hr_employees e
    WHERE e.id = hr_work_log_weeks.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Managers update team week logs"
  ON public.hr_work_log_weeks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM hr_employees e
    WHERE e.id = hr_work_log_weeks.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins view all week logs"
  ON public.hr_work_log_weeks FOR SELECT TO authenticated
  USING (public.user_role() = 'Admin');
CREATE POLICY "Admins update all week logs"
  ON public.hr_work_log_weeks FOR UPDATE TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 19: hr_work_log_tasks ──────────────────────────────
CREATE TABLE public.hr_work_log_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_log_id UUID NOT NULL REFERENCES public.hr_work_log_weeks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  day_status TEXT NOT NULL DEFAULT 'Draft' CHECK (day_status IN ('Draft','Submitted','Approved','Rework')),
  task_title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Meeting','Development','Support','Learning','Documentation','Design','Review','Planning','Admin','Other')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  assigned_by_type TEXT NOT NULL DEFAULT 'Self' CHECK (assigned_by_type IN ('Self','Employee','Manager','Admin')),
  assigned_by_id UUID REFERENCES public.hr_employees(id),
  description TEXT,
  rework_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_log_tasks_employee_date ON public.hr_work_log_tasks(employee_id, log_date);
CREATE INDEX idx_work_log_tasks_week_log ON public.hr_work_log_tasks(week_log_id, log_date);
CREATE INDEX idx_work_log_tasks_day_status ON public.hr_work_log_tasks(day_status);

ALTER TABLE public.hr_work_log_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own tasks"
  ON public.hr_work_log_tasks FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees insert own tasks"
  ON public.hr_work_log_tasks FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own draft tasks"
  ON public.hr_work_log_tasks FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND day_status IN ('Draft','Rework'));
CREATE POLICY "Employees delete own draft tasks"
  ON public.hr_work_log_tasks FOR DELETE TO authenticated
  USING (employee_id = public.user_employee_id() AND day_status = 'Draft');
CREATE POLICY "Managers view team tasks"
  ON public.hr_work_log_tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM hr_employees e
    WHERE e.id = hr_work_log_tasks.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Managers update team tasks"
  ON public.hr_work_log_tasks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM hr_employees e
    WHERE e.id = hr_work_log_tasks.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins view all tasks"
  ON public.hr_work_log_tasks FOR SELECT TO authenticated
  USING (public.user_role() = 'Admin');
CREATE POLICY "Admins update all tasks"
  ON public.hr_work_log_tasks FOR UPDATE TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Trigger: auto-update week total_minutes ──────────────────
CREATE OR REPLACE FUNCTION update_week_log_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE hr_work_log_weeks
    SET total_minutes = COALESCE((
      SELECT SUM(duration_minutes) FROM hr_work_log_tasks WHERE week_log_id = OLD.week_log_id
    ), 0), updated_at = now()
    WHERE id = OLD.week_log_id;
    RETURN OLD;
  ELSE
    UPDATE hr_work_log_weeks
    SET total_minutes = COALESCE((
      SELECT SUM(duration_minutes) FROM hr_work_log_tasks WHERE week_log_id = NEW.week_log_id
    ), 0), updated_at = now()
    WHERE id = NEW.week_log_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_week_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_work_log_tasks
  FOR EACH ROW EXECUTE FUNCTION update_week_log_totals();
