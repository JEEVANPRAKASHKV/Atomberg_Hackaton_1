-- ============================================================
-- AtombergHR — Script 4: Missing Tables Patch
-- Run this in Supabase SQL Editor if hr_attendance or
-- hr_salary tables are missing or incomplete
-- ============================================================

-- ── Drop and recreate hr_attendance with all columns ────────
DROP TABLE IF EXISTS public.hr_attendance CASCADE;

CREATE TABLE public.hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  punch_in_time TIMESTAMPTZ,
  punch_out_time TIMESTAMPTZ,
  total_hours NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'Absent' CHECK (status IN ('Present','Absent','Half Day','Late','Work From Home')),
  notes TEXT,
  is_consolidated BOOLEAN DEFAULT false,
  regularization_reason TEXT,
  regularization_status TEXT DEFAULT 'None' CHECK (regularization_status IN ('None','Pending','Approved','Rejected')),
  regularization_approved_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own attendance"
  ON public.hr_attendance FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());

CREATE POLICY "Employees can insert own attendance"
  ON public.hr_attendance FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());

CREATE POLICY "Employees can update own attendance"
  ON public.hr_attendance FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id());

CREATE POLICY "Admins can manage all attendance"
  ON public.hr_attendance FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

CREATE INDEX idx_attendance_employee_date ON public.hr_attendance(employee_id, attendance_date);
CREATE INDEX idx_attendance_consolidated ON public.hr_attendance(employee_id, attendance_date, is_consolidated);

-- ── hr_salary ────────────────────────────────────────────────
DROP TABLE IF EXISTS public.hr_salary CASCADE;

CREATE TABLE public.hr_salary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  hra NUMERIC(12,2) DEFAULT 0,
  special_allowance NUMERIC(12,2) DEFAULT 0,
  other_allowances NUMERIC(12,2) DEFAULT 0,
  gross_salary NUMERIC(12,2) DEFAULT 0,
  pf_deduction NUMERIC(12,2) DEFAULT 0,
  tds_deduction NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  payslip_url TEXT,
  payment_date DATE,
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending','Paid','On Hold')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

ALTER TABLE public.hr_salary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own salary"
  ON public.hr_salary FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());

CREATE POLICY "Admins can manage all salary"
  ON public.hr_salary FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

CREATE INDEX IF NOT EXISTS idx_salary_employee_period ON public.hr_salary(employee_id, year, month);

-- ── hr_leaves ────────────────────────────────────────────────
DROP TABLE IF EXISTS public.hr_leaves CASCADE;

CREATE TABLE public.hr_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('Annual','Sick','Casual','Maternity','Paternity','Unpaid','Other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(4,1) DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
  approved_by UUID REFERENCES public.hr_employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own leaves"
  ON public.hr_leaves FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());

CREATE POLICY "Employees can apply for leaves"
  ON public.hr_leaves FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());

CREATE POLICY "Employees can cancel own pending leaves"
  ON public.hr_leaves FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id() AND status = 'Pending');

CREATE POLICY "Managers can view team leaves"
  ON public.hr_leaves FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hr_employees e
      WHERE e.id = hr_leaves.employee_id
      AND e.manager_id = public.user_employee_id()
    )
  );

CREATE POLICY "Managers can approve team leaves"
  ON public.hr_leaves FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hr_employees e
      WHERE e.id = hr_leaves.employee_id
      AND e.manager_id = public.user_employee_id()
    )
  );

CREATE POLICY "Admins can manage all leaves"
  ON public.hr_leaves FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── hr_holidays ──────────────────────────────────────────────
DROP TABLE IF EXISTS public.hr_holidays CASCADE;

CREATE TABLE public.hr_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL UNIQUE,
  holiday_type TEXT DEFAULT 'Public' CHECK (holiday_type IN ('Public','Optional','Restricted')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view holidays"
  ON public.hr_holidays FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage holidays"
  ON public.hr_holidays FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── hr_announcements ─────────────────────────────────────────
DROP TABLE IF EXISTS public.hr_announcements CASCADE;

CREATE TABLE public.hr_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low','Normal','High','Urgent')),
  target_roles TEXT[] DEFAULT ARRAY['Employee','Manager','Admin'],
  created_by UUID REFERENCES public.hr_employees(id),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All users can view active announcements"
  ON public.hr_announcements FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
  ON public.hr_announcements FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── hr_documents ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.hr_documents CASCADE;

CREATE TABLE public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('Offer Letter','Appointment Letter','Payslip','PF Statement','Form 16','NDA','Policy','Other')),
  file_url TEXT,
  uploaded_by UUID REFERENCES public.hr_employees(id),
  is_visible_to_employee BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own documents"
  ON public.hr_documents FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id() AND is_visible_to_employee = true);

CREATE POLICY "Admins can manage all documents"
  ON public.hr_documents FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Salary-slips storage bucket ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('salary-slips', 'salary-slips', false)
  ON CONFLICT (id) DO NOTHING;
