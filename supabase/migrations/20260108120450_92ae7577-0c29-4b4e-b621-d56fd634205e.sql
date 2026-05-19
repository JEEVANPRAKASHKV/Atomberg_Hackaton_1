-- Add policy to allow all authenticated users to view employee details for contacts
-- This enables the contact directory to show all employees' info

CREATE POLICY "select_active_employee_details"
ON public.hr_employee_details
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM hr_employees 
    WHERE status = 'Active'
  )
);