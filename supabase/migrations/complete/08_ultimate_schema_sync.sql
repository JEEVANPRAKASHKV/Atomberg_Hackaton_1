-- ============================================================
-- AtombergHR — Script 8: Ultimate Schema Sync Patch
-- Run this in Supabase SQL Editor to fix UI crashes caused by 
-- missing columns and tables.
-- ============================================================

-- 1. hr_leave_entitlements
DROP TABLE IF EXISTS public.hr_leave_entitlements CASCADE;
CREATE TABLE public.hr_leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  org_id TEXT DEFAULT 'default',
  total_leaves NUMERIC(4,1) DEFAULT 0,
  used_leaves NUMERIC(4,1) DEFAULT 0,
  remaining_leaves NUMERIC(4,1) DEFAULT 0,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_leave_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view own entitlements" ON public.hr_leave_entitlements FOR SELECT TO authenticated USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins can manage all entitlements" ON public.hr_leave_entitlements FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- 2. hr_attendance_regularization_requests
DROP TABLE IF EXISTS public.hr_attendance_regularization_requests CASCADE;
CREATE TABLE public.hr_attendance_regularization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  requested_status TEXT NOT NULL,
  current_status TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.hr_employees(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.hr_attendance_regularization_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can manage own requests" ON public.hr_attendance_regularization_requests FOR ALL TO authenticated USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins can manage all requests" ON public.hr_attendance_regularization_requests FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- 3. hr_holidays
DROP TABLE IF EXISTS public.hr_holidays CASCADE;
CREATE TABLE public.hr_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name TEXT NOT NULL,
  holiday_date DATE NOT NULL UNIQUE,
  holiday_type TEXT NOT NULL,
  description TEXT,
  is_optional BOOLEAN DEFAULT false,
  year INTEGER NOT NULL,
  created_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view holidays" ON public.hr_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage holidays" ON public.hr_holidays FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- 4. hr_announcements
DROP TABLE IF EXISTS public.hr_announcements CASCADE;
CREATE TABLE public.hr_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.hr_employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can view announcements" ON public.hr_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage announcements" ON public.hr_announcements FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- 5. hr_documents
DROP TABLE IF EXISTS public.hr_documents CASCADE;
CREATE TABLE public.hr_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_category TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size NUMERIC,
  file_type TEXT,
  notes TEXT,
  uploaded_by UUID REFERENCES public.hr_employees(id),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can view own documents" ON public.hr_documents FOR SELECT TO authenticated USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins can manage all documents" ON public.hr_documents FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- 6. hr_onboarding_tasks
DROP TABLE IF EXISTS public.hr_onboarding_tasks CASCADE;
CREATE TABLE public.hr_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_order INTEGER NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'Pending',
  document_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees can update own onboarding tasks" ON public.hr_onboarding_tasks FOR ALL TO authenticated USING (employee_id = public.user_employee_id());
CREATE POLICY "Admins can manage all onboarding tasks" ON public.hr_onboarding_tasks FOR ALL TO authenticated USING (public.user_role() = 'Admin');

-- Seed initial data for entitlements
INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Casual Leave', 2026, 6, 6 FROM public.hr_employees;
INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Sick Leave', 2026, 6, 6 FROM public.hr_employees;
INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Earned Leave', 2026, 18, 18 FROM public.hr_employees;
INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Special Leave', 2026, 1, 1 FROM public.hr_employees;
