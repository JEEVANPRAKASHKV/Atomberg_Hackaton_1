-- ============================================================
-- Goal Setting & Tracking Portal — Schema Migration
-- AtomQuest Hackathon 1.0
-- ============================================================

-- Table 1: hr_goal_cycles
-- Stores annual goal cycles and quarterly window dates
CREATE TABLE IF NOT EXISTS hr_goal_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_name TEXT NOT NULL,                          -- e.g. "FY 2025-26"
  goal_setting_opens DATE NOT NULL,                  -- Phase 1 opens (1st May)
  q1_opens DATE NOT NULL,                            -- July
  q2_opens DATE NOT NULL,                            -- October
  q3_opens DATE NOT NULL,                            -- January
  q4_opens DATE NOT NULL,                            -- March/April
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: hr_thrust_areas
-- Admin-defined goal categories / thrust areas
CREATE TABLE IF NOT EXISTS hr_thrust_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                                -- e.g. "Sales", "Operations", "Safety"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 3: hr_goal_sheets
-- One goal sheet per employee per cycle
CREATE TABLE IF NOT EXISTS hr_goal_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hr_employees(id),
  cycle_id UUID NOT NULL REFERENCES hr_goal_cycles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rework')),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES hr_employees(id),
  approved_at TIMESTAMPTZ,
  rework_comment TEXT,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, cycle_id)
);

-- Table 4: hr_goals
-- Individual goals within a goal sheet
CREATE TABLE IF NOT EXISTS hr_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id UUID NOT NULL REFERENCES hr_goal_sheets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id),
  thrust_area_id UUID REFERENCES hr_thrust_areas(id),
  goal_title TEXT NOT NULL,
  description TEXT,
  uom_type TEXT NOT NULL CHECK (uom_type IN ('min', 'max', 'timeline', 'zero')),
  -- min = higher is better (e.g. Sales Revenue)
  -- max = lower is better (e.g. TAT, Cost)
  -- timeline = date-based completion
  -- zero = zero = success (e.g. Safety incidents)
  target_value NUMERIC,
  target_date DATE,
  weightage NUMERIC NOT NULL CHECK (weightage >= 10 AND weightage <= 100),
  is_shared BOOLEAN DEFAULT false,
  shared_goal_id UUID REFERENCES hr_goals(id),       -- links to source if pushed by admin
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 5: hr_shared_goals
-- Departmental KPIs pushed by Admin/Manager to multiple employees
CREATE TABLE IF NOT EXISTS hr_shared_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES hr_goal_cycles(id),
  source_goal_id UUID NOT NULL REFERENCES hr_goals(id),
  pushed_by UUID NOT NULL REFERENCES hr_employees(id),
  target_employee_id UUID NOT NULL REFERENCES hr_employees(id),
  custom_weightage NUMERIC CHECK (custom_weightage >= 10),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 6: hr_goal_checkins
-- Quarterly actual achievement entries per goal
CREATE TABLE IF NOT EXISTS hr_goal_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES hr_goals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_employees(id),
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  actual_value NUMERIC,
  actual_date DATE,
  progress_status TEXT DEFAULT 'not_started' CHECK (progress_status IN ('not_started', 'on_track', 'completed')),
  computed_score NUMERIC,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(goal_id, quarter)
);

-- Table 7: hr_checkin_comments
-- Manager's structured check-in comment per employee per quarter
CREATE TABLE IF NOT EXISTS hr_checkin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id UUID NOT NULL REFERENCES hr_goal_sheets(id),
  manager_id UUID NOT NULL REFERENCES hr_employees(id),
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table 8: hr_goal_audit_log
-- Immutable log of every change made to goals after lock date
CREATE TABLE IF NOT EXISTS hr_goal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES hr_goals(id),
  changed_by UUID NOT NULL REFERENCES hr_employees(id),
  change_type TEXT NOT NULL,  -- 'edit', 'unlock', 'status_change', 'admin_override'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Enable Row Level Security (RLS) on all new tables
-- ============================================================
ALTER TABLE hr_goal_cycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_thrust_areas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_goal_sheets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_goals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_shared_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_goal_checkins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_checkin_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_goal_audit_log    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Helper: get current user's employee record
-- We use inline subqueries referencing hr_employees.user_id = auth.uid()

-- hr_goal_cycles: all authenticated users can view; only Admins can insert/update
CREATE POLICY "all_view_cycles" ON hr_goal_cycles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_cycles" ON hr_goal_cycles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_thrust_areas: all can view; only Admins can manage
CREATE POLICY "all_view_thrust_areas" ON hr_thrust_areas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_thrust_areas" ON hr_thrust_areas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_goal_sheets
CREATE POLICY "employee_own_sheets" ON hr_goal_sheets
  FOR ALL TO authenticated
  USING (
    employee_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "manager_team_sheets" ON hr_goal_sheets
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM hr_employees
      WHERE manager_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "manager_approve_sheets" ON hr_goal_sheets
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM hr_employees
      WHERE manager_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "admin_all_sheets" ON hr_goal_sheets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_goals
CREATE POLICY "employee_own_goals" ON hr_goals
  FOR ALL TO authenticated
  USING (
    employee_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "manager_team_goals" ON hr_goals
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM hr_employees
      WHERE manager_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "manager_edit_goals" ON hr_goals
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM hr_employees
      WHERE manager_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "admin_all_goals" ON hr_goals
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_shared_goals
CREATE POLICY "employee_own_shared_goals" ON hr_shared_goals
  FOR SELECT TO authenticated
  USING (
    target_employee_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "manager_push_shared_goals" ON hr_shared_goals
  FOR ALL TO authenticated
  USING (
    pushed_by = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_goal_checkins
CREATE POLICY "employee_own_checkins" ON hr_goal_checkins
  FOR ALL TO authenticated
  USING (
    employee_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "manager_view_team_checkins" ON hr_goal_checkins
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM hr_employees
      WHERE manager_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "admin_all_checkins" ON hr_goal_checkins
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_checkin_comments
CREATE POLICY "manager_own_comments" ON hr_checkin_comments
  FOR ALL TO authenticated
  USING (
    manager_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
  );

CREATE POLICY "employee_view_comments" ON hr_checkin_comments
  FOR SELECT TO authenticated
  USING (
    goal_sheet_id IN (
      SELECT id FROM hr_goal_sheets
      WHERE employee_id = (SELECT id FROM hr_employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "admin_all_comments" ON hr_checkin_comments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

-- hr_goal_audit_log
CREATE POLICY "admin_view_audit" ON hr_goal_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM hr_employees WHERE user_id = auth.uid() AND role = 'Admin')
  );

CREATE POLICY "system_insert_audit" ON hr_goal_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Updated_at auto-update triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_goal_cycles_updated_at
  BEFORE UPDATE ON hr_goal_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_goal_sheets_updated_at
  BEFORE UPDATE ON hr_goal_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON hr_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_goal_checkins_updated_at
  BEFORE UPDATE ON hr_goal_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_checkin_comments_updated_at
  BEFORE UPDATE ON hr_checkin_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Seed default Thrust Areas
-- ============================================================
INSERT INTO hr_thrust_areas (name, description) VALUES
  ('Sales & Revenue',        'Revenue growth, customer acquisition, and sales targets'),
  ('Operations & Efficiency','Process improvement, cost reduction, and turnaround time'),
  ('People & Culture',       'Employee satisfaction, hiring, learning & development'),
  ('Quality & Compliance',   'Product quality, audit compliance, and safety standards'),
  ('Technology & Innovation','R&D, product launches, and digital transformation'),
  ('Customer Success',       'Customer retention, NPS, and service excellence'),
  ('Finance & Cost Control', 'Budgeting, cost management, and profitability')
ON CONFLICT DO NOTHING;
