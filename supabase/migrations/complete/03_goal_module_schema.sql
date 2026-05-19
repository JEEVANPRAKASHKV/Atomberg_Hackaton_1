-- ============================================================
-- AtombergHR — Script 3: Goal Module Schema
-- Run this THIRD in Supabase SQL Editor
-- ============================================================

-- ── Table 20: hr_goal_cycles ─────────────────────────────────
CREATE TABLE public.hr_goal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_name TEXT NOT NULL,
  goal_setting_opens DATE NOT NULL,
  q1_opens DATE NOT NULL,
  q2_opens DATE NOT NULL,
  q3_opens DATE NOT NULL,
  q4_opens DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_goal_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users view cycles"
  ON public.hr_goal_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cycles"
  ON public.hr_goal_cycles FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 21: hr_thrust_areas ────────────────────────────────
CREATE TABLE public.hr_thrust_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_thrust_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users view thrust areas"
  ON public.hr_thrust_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage thrust areas"
  ON public.hr_thrust_areas FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 22: hr_goal_sheets ─────────────────────────────────
CREATE TABLE public.hr_goal_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  cycle_id UUID NOT NULL REFERENCES public.hr_goal_cycles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rework')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.hr_employees(id),
  approved_at TIMESTAMPTZ,
  rework_comment TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, cycle_id)
);

CREATE INDEX idx_goal_sheets_employee ON public.hr_goal_sheets(employee_id);
CREATE INDEX idx_goal_sheets_cycle    ON public.hr_goal_sheets(cycle_id);
CREATE INDEX idx_goal_sheets_status   ON public.hr_goal_sheets(status);

ALTER TABLE public.hr_goal_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own sheets"
  ON public.hr_goal_sheets FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees insert own sheets"
  ON public.hr_goal_sheets FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own draft sheets"
  ON public.hr_goal_sheets FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status IN ('draft','rework'))
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team sheets"
  ON public.hr_goal_sheets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_goal_sheets.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Managers approve team sheets"
  ON public.hr_goal_sheets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_goal_sheets.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all sheets"
  ON public.hr_goal_sheets FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 23: hr_goals ───────────────────────────────────────
CREATE TABLE public.hr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id UUID NOT NULL REFERENCES public.hr_goal_sheets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  thrust_area_id UUID REFERENCES public.hr_thrust_areas(id),
  goal_title TEXT NOT NULL,
  description TEXT,
  uom_type TEXT NOT NULL CHECK (uom_type IN ('min','max','timeline','zero')),
  target_value NUMERIC,
  target_date DATE,
  weightage NUMERIC NOT NULL CHECK (weightage >= 10 AND weightage <= 100),
  is_shared BOOLEAN DEFAULT false,
  shared_goal_id UUID REFERENCES public.hr_goals(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goals_sheet    ON public.hr_goals(goal_sheet_id);
CREATE INDEX idx_goals_employee ON public.hr_goals(employee_id);

ALTER TABLE public.hr_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own goals"
  ON public.hr_goals FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees insert own goals"
  ON public.hr_goals FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own goals"
  ON public.hr_goals FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees delete own goals"
  ON public.hr_goals FOR DELETE TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team goals"
  ON public.hr_goals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_goals.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Managers edit team goals"
  ON public.hr_goals FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_goals.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all goals"
  ON public.hr_goals FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 24: hr_shared_goals ────────────────────────────────
CREATE TABLE public.hr_shared_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.hr_goal_cycles(id),
  source_goal_id UUID NOT NULL REFERENCES public.hr_goals(id),
  pushed_by UUID NOT NULL REFERENCES public.hr_employees(id),
  target_employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  custom_weightage NUMERIC CHECK (custom_weightage >= 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_shared_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view shared goals sent to them"
  ON public.hr_shared_goals FOR SELECT TO authenticated
  USING (target_employee_id = public.user_employee_id());
CREATE POLICY "Managers and admins push shared goals"
  ON public.hr_shared_goals FOR ALL TO authenticated
  USING (
    pushed_by = public.user_employee_id()
    OR public.user_role() = 'Admin'
  );

-- ── Table 25: hr_goal_checkins ───────────────────────────────
CREATE TABLE public.hr_goal_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.hr_goals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id),
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  actual_value NUMERIC,
  actual_date DATE,
  progress_status TEXT DEFAULT 'not_started' CHECK (progress_status IN ('not_started','on_track','completed')),
  computed_score NUMERIC,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, quarter)
);

CREATE INDEX idx_checkins_goal     ON public.hr_goal_checkins(goal_id);
CREATE INDEX idx_checkins_employee ON public.hr_goal_checkins(employee_id);

ALTER TABLE public.hr_goal_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees manage own checkins"
  ON public.hr_goal_checkins FOR ALL TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team checkins"
  ON public.hr_goal_checkins FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_goal_checkins.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all checkins"
  ON public.hr_goal_checkins FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 26: hr_checkin_comments ────────────────────────────
CREATE TABLE public.hr_checkin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id UUID NOT NULL REFERENCES public.hr_goal_sheets(id),
  manager_id UUID NOT NULL REFERENCES public.hr_employees(id),
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_checkin_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage own comments"
  ON public.hr_checkin_comments FOR ALL TO authenticated
  USING (manager_id = public.user_employee_id());
CREATE POLICY "Employees view comments on their sheets"
  ON public.hr_checkin_comments FOR SELECT TO authenticated
  USING (goal_sheet_id IN (
    SELECT id FROM public.hr_goal_sheets
    WHERE employee_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all comments"
  ON public.hr_checkin_comments FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 27: hr_goal_audit_log ──────────────────────────────
CREATE TABLE public.hr_goal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.hr_goals(id),
  changed_by UUID NOT NULL REFERENCES public.hr_employees(id),
  change_type TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_goal ON public.hr_goal_audit_log(goal_id);

ALTER TABLE public.hr_goal_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit log"
  ON public.hr_goal_audit_log FOR SELECT TO authenticated
  USING (public.user_role() = 'Admin');
CREATE POLICY "System inserts audit entries"
  ON public.hr_goal_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── updated_at Triggers ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_goal_cycles_updated_at
  BEFORE UPDATE ON public.hr_goal_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_goal_sheets_updated_at
  BEFORE UPDATE ON public.hr_goal_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON public.hr_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_goal_checkins_updated_at
  BEFORE UPDATE ON public.hr_goal_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_checkin_comments_updated_at
  BEFORE UPDATE ON public.hr_checkin_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed: Default Thrust Areas ───────────────────────────────
INSERT INTO public.hr_thrust_areas (name, description) VALUES
  ('Sales & Revenue',         'Revenue growth, customer acquisition, and sales targets'),
  ('Operations & Efficiency', 'Process improvement, cost reduction, and turnaround time'),
  ('People & Culture',        'Employee satisfaction, hiring, learning and development'),
  ('Quality & Compliance',    'Product quality, audit compliance, and safety standards'),
  ('Technology & Innovation', 'R&D, product launches, and digital transformation'),
  ('Customer Success',        'Customer retention, NPS, and service excellence'),
  ('Finance & Cost Control',  'Budgeting, cost management, and profitability')
ON CONFLICT DO NOTHING;
