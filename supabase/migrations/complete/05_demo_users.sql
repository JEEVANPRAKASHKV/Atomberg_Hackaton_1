-- ============================================================
-- AtombergHR — Script 5: Demo Users
-- Run AFTER creating auth users in Supabase Dashboard:
--   manager@atomberghr.demo  / Manager@123
--   employee@atomberghr.demo / Employee@123
-- ============================================================

-- Step 1: Insert Manager (reports to Admin/Jeevan)
INSERT INTO public.hr_employees (
  user_id,
  full_name,
  email,
  role,
  status,
  employee_code,
  department,
  designation,
  date_of_joining,
  employment_type,
  leave_balance
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'manager@atomberghr.demo'),
  'Arjun Mehta',
  'manager@atomberghr.demo',
  'Manager',
  'Active',
  'ATM002',
  'Engineering',
  'Engineering Manager',
  '2024-01-15',
  'Full-time',
  18
)
ON CONFLICT (email) DO NOTHING;


-- Step 2: Insert Employee (reports to Arjun/Manager)
INSERT INTO public.hr_employees (
  user_id,
  full_name,
  email,
  role,
  status,
  employee_code,
  department,
  designation,
  manager_id,
  date_of_joining,
  employment_type,
  leave_balance
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'employee@atomberghr.demo'),
  'Priya Sharma',
  'employee@atomberghr.demo',
  'Employee',
  'Active',
  'ATM003',
  'Engineering',
  'Software Engineer',
  (SELECT id FROM public.hr_employees WHERE email = 'manager@atomberghr.demo'),
  '2024-06-01',
  'Full-time',
  18
)
ON CONFLICT (email) DO NOTHING;


-- Step 3: Link Manager to Admin as their manager (optional)
UPDATE public.hr_employees
SET manager_id = (SELECT id FROM public.hr_employees WHERE email = 'jeevanprakash.undp@gmail.com')
WHERE email = 'manager@atomberghr.demo';


-- Step 4: Verify all 3 users
SELECT
  employee_code,
  full_name,
  email,
  role,
  department,
  designation,
  status,
  CASE WHEN user_id IS NOT NULL THEN 'Linked' ELSE 'NOT LINKED' END AS auth_status
FROM public.hr_employees
ORDER BY employee_code;
