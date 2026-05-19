-- Allow Admin to UPDATE any attendance record
CREATE POLICY "admin_update_all_attendance"
ON hr_attendance FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM hr_employees 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM hr_employees 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Allow Admin to INSERT any attendance record
CREATE POLICY "admin_insert_all_attendance"
ON hr_attendance FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM hr_employees 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);