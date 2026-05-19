-- ============================================================
-- AtombergHR — Script 7: Leave Entitlements Patch
-- Run this in Supabase SQL Editor to fix the "Failed to load leave data" error
-- ============================================================

-- 1. Create the missing hr_leave_entitlements table
CREATE TABLE IF NOT EXISTS public.hr_leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_leaves NUMERIC(4,1) DEFAULT 0,
  used_leaves NUMERIC(4,1) DEFAULT 0,
  remaining_leaves NUMERIC(4,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, leave_type, year)
);

ALTER TABLE public.hr_leave_entitlements ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS Policies for hr_leave_entitlements
DROP POLICY IF EXISTS "Employees can view own entitlements" ON public.hr_leave_entitlements;
CREATE POLICY "Employees can view own entitlements"
  ON public.hr_leave_entitlements FOR SELECT TO authenticated
  USING (employee_id = public.user_employee_id());

DROP POLICY IF EXISTS "Managers can view team entitlements" ON public.hr_leave_entitlements;
CREATE POLICY "Managers can view team entitlements"
  ON public.hr_leave_entitlements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hr_employees e
    WHERE e.id = hr_leave_entitlements.employee_id
    AND e.manager_id = public.user_employee_id()
  ));

DROP POLICY IF EXISTS "Admins can manage all entitlements" ON public.hr_leave_entitlements;
CREATE POLICY "Admins can manage all entitlements"
  ON public.hr_leave_entitlements FOR ALL TO authenticated
  USING (public.user_role() = 'Admin');

-- 3. Cleanup the unused hr_leaves table (the frontend uses hr_leave_requests)
DROP TABLE IF EXISTS public.hr_leaves CASCADE;

-- 4. Automatically seed some initial entitlements for all existing employees for 2026
INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Casual Leave', 2026, 6, 6 FROM public.hr_employees
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Sick Leave', 2026, 6, 6 FROM public.hr_employees
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Earned Leave', 2026, 18, 18 FROM public.hr_employees
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_leave_entitlements (employee_id, leave_type, year, total_leaves, remaining_leaves)
SELECT id, 'Special Leave', 2026, 1, 1 FROM public.hr_employees
ON CONFLICT DO NOTHING;
