-- ============================================================
-- AtombergHR — Script 1: Base HR Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- ── Table 1: hr_employees ────────────────────────────────────
-- NOTE: Helper functions are created AFTER this table (they reference it)
CREATE TABLE public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Employee' CHECK (role IN ('Admin','Manager','Employee')),
  department TEXT,
  designation TEXT,
  manager_id UUID REFERENCES public.hr_employees(id),
  date_of_joining DATE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('Male','Female','Other')),
  employment_type TEXT DEFAULT 'Full-time' CHECK (employment_type IN ('Full-time','Part-time','Contract','Intern')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Terminated')),
  location TEXT,
  leave_balance INTEGER DEFAULT 18,
  email_notifications_enabled BOOLEAN DEFAULT true,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Helper Functions (must come AFTER hr_employees table) ────
CREATE OR REPLACE FUNCTION public.user_employee_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.hr_employees WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.hr_employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── RLS for hr_employees ─────────────────────────────────────
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all employees"
  ON public.hr_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can update own record"
  ON public.hr_employees FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all employees"
  ON public.hr_employees FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 2: hr_employee_details ────────────────────────────
CREATE TABLE public.hr_employee_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  blood_group TEXT,
  pan_number TEXT,
  aadhaar_number TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  linkedin_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_employee_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own details"
  ON public.hr_employee_details FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees insert own details"
  ON public.hr_employee_details FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own details"
  ON public.hr_employee_details FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage all details"
  ON public.hr_employee_details FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');
CREATE POLICY "Active employee contacts visible"
  ON public.hr_employee_details FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM hr_employees WHERE status = 'Active'));

-- ── Table 3: hr_attendance ───────────────────────────────────
CREATE TABLE public.hr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'Absent' CHECK (status IN ('Present','Absent','Half Day','Late','Work From Home','On Leave')),
  work_hours NUMERIC(5,2),
  notes TEXT,
  is_consolidated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attendance_employee_date ON public.hr_attendance(employee_id, attendance_date);
CREATE INDEX idx_attendance_consolidated ON public.hr_attendance(employee_id, attendance_date, is_consolidated);

ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own attendance"
  ON public.hr_attendance FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees insert own attendance"
  ON public.hr_attendance FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own attendance"
  ON public.hr_attendance FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team attendance"
  ON public.hr_attendance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_attendance.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins view all attendance"
  ON public.hr_attendance FOR SELECT TO authenticated
  USING (public.user_role() = 'Admin');
CREATE POLICY "Admins update all attendance"
  ON public.hr_attendance FOR UPDATE TO authenticated
  USING (public.user_role() = 'Admin')
  WITH CHECK (public.user_role() = 'Admin');
CREATE POLICY "Admins insert all attendance"
  ON public.hr_attendance FOR INSERT TO authenticated
  WITH CHECK (public.user_role() = 'Admin');

-- ── Table 4: hr_attendance_regularization_requests ──────────
CREATE TABLE public.hr_attendance_regularization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  requested_check_in TIMESTAMPTZ,
  requested_check_out TIMESTAMPTZ,
  requested_status TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  reviewed_by UUID REFERENCES public.hr_employees(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_attendance_regularization_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage own regularization"
  ON public.hr_attendance_regularization_requests FOR ALL TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team regularization"
  ON public.hr_attendance_regularization_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_attendance_regularization_requests.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all regularization"
  ON public.hr_attendance_regularization_requests FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 5: hr_leave_entitlements ──────────────────────────
CREATE TABLE public.hr_leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  total_days NUMERIC(5,2) DEFAULT 0,
  used_days NUMERIC(5,2) DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, leave_type, year)
);

ALTER TABLE public.hr_leave_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own entitlements"
  ON public.hr_leave_entitlements FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage all entitlements"
  ON public.hr_leave_entitlements FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 6: hr_leave_requests ───────────────────────────────
CREATE TABLE public.hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
  reviewed_by UUID REFERENCES public.hr_employees(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees manage own leave requests"
  ON public.hr_leave_requests FOR ALL TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team leave requests"
  ON public.hr_leave_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_leave_requests.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Managers update team leave requests"
  ON public.hr_leave_requests FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_leave_requests.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all leave requests"
  ON public.hr_leave_requests FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 7: hr_holidays ─────────────────────────────────────
CREATE TABLE public.hr_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'Public' CHECK (type IN ('Public','Optional','Restricted')),
  description TEXT,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users view holidays"
  ON public.hr_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage holidays"
  ON public.hr_holidays FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- ── Table 8: hr_announcements ────────────────────────────────
CREATE TABLE public.hr_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low','Normal','High','Urgent')),
  category TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users view published announcements"
  ON public.hr_announcements FOR SELECT TO authenticated
  USING (is_published = true);
CREATE POLICY "Admins manage announcements"
  ON public.hr_announcements FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 9: hr_announcement_reads ──────────────────────────
CREATE TABLE public.hr_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.hr_announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

ALTER TABLE public.hr_announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees manage own reads"
  ON public.hr_announcement_reads FOR ALL TO authenticated
  USING (employee_id = public.user_employee_id());

-- ── Table 10: hr_appreciations ───────────────────────────────
CREATE TABLE public.hr_appreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  to_employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  message TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  visible_to_team TEXT DEFAULT 'All',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_appreciations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View public appreciations"
  ON public.hr_appreciations FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "View own appreciations"
  ON public.hr_appreciations FOR SELECT TO authenticated
  USING (
    to_employee_id = public.user_employee_id()
    OR from_employee_id = public.user_employee_id()
  );
CREATE POLICY "Insert own appreciations"
  ON public.hr_appreciations FOR INSERT TO authenticated
  WITH CHECK (from_employee_id = public.user_employee_id());
CREATE POLICY "Admins view all appreciations"
  ON public.hr_appreciations FOR SELECT TO authenticated
  USING (public.user_role() = 'Admin');
CREATE POLICY "Managers view team appreciations"
  ON public.hr_appreciations FOR SELECT TO authenticated
  USING (
    public.user_role() = 'Manager'
    AND visible_to_team IS NOT NULL
    AND visible_to_team != 'Private'
  );

-- ── Table 11: hr_notifications ───────────────────────────────
CREATE TABLE public.hr_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees manage own notifications"
  ON public.hr_notifications FOR ALL TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins insert notifications"
  ON public.hr_notifications FOR INSERT TO authenticated
  WITH CHECK (public.user_role() = 'Admin');

-- ── Table 12: hr_documents ───────────────────────────────────
CREATE TABLE public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.hr_employees(id),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own documents"
  ON public.hr_documents FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees upload own documents"
  ON public.hr_documents FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage all documents"
  ON public.hr_documents FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 13: hr_salary_slips ────────────────────────────────
CREATE TABLE public.hr_salary_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  basic_salary NUMERIC(12,2),
  hra NUMERIC(12,2),
  allowances NUMERIC(12,2),
  deductions NUMERIC(12,2),
  net_salary NUMERIC(12,2),
  file_url TEXT,
  status TEXT DEFAULT 'Generated' CHECK (status IN ('Generated','Sent','Acknowledged')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

ALTER TABLE public.hr_salary_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own slips"
  ON public.hr_salary_slips FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage all slips"
  ON public.hr_salary_slips FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 14: hr_salary_history ──────────────────────────────
CREATE TABLE public.hr_salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  ctc NUMERIC(12,2),
  basic NUMERIC(12,2),
  reason TEXT,
  changed_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_salary_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own salary history"
  ON public.hr_salary_history FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage salary history"
  ON public.hr_salary_history FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 15: hr_onboarding_tasks ────────────────────────────
CREATE TABLE public.hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  assigned_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own onboarding"
  ON public.hr_onboarding_tasks FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Employees update own onboarding"
  ON public.hr_onboarding_tasks FOR UPDATE TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage all onboarding"
  ON public.hr_onboarding_tasks FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 16: hr_offboarding ─────────────────────────────────
CREATE TABLE public.hr_offboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE UNIQUE,
  last_working_date DATE,
  reason TEXT,
  exit_interview_done BOOLEAN DEFAULT false,
  noc_issued BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Initiated' CHECK (status IN ('Initiated','In Progress','Completed')),
  created_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_offboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own offboarding"
  ON public.hr_offboarding FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Managers view team offboarding"
  ON public.hr_offboarding FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_offboarding.employee_id
    AND e.manager_id = public.user_employee_id()
  ));
CREATE POLICY "Admins manage all offboarding"
  ON public.hr_offboarding FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Table 17: hr_offboarding_tasks ───────────────────────────
CREATE TABLE public.hr_offboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id UUID NOT NULL REFERENCES public.hr_offboarding(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_offboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own offboarding tasks"
  ON public.hr_offboarding_tasks FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins manage all offboarding tasks"
  ON public.hr_offboarding_tasks FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- ── Storage Bucket: salary-slips ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('salary-slips', 'salary-slips', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Employees download own payslips"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'salary-slips'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM hr_employees WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins upload payslips"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'salary-slips' AND public.user_role() = 'Admin');
CREATE POLICY "Admins view all payslips"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'salary-slips' AND public.user_role() = 'Admin');
