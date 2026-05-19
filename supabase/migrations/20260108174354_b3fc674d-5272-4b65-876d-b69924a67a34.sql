-- Remove unique constraint to allow multiple punches per day
ALTER TABLE hr_attendance DROP CONSTRAINT IF EXISTS hr_attendance_employee_id_attendance_date_key;

-- Add column to track if this is a consolidated record
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS is_consolidated BOOLEAN DEFAULT false;

-- Add index for faster queries on consolidated records
CREATE INDEX IF NOT EXISTS idx_attendance_consolidated ON hr_attendance(employee_id, attendance_date, is_consolidated);