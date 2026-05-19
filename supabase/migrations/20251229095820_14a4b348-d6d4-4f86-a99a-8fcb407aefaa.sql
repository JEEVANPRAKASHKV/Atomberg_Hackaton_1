-- Create storage bucket for salary slips
INSERT INTO storage.buckets (id, name, public) VALUES ('salary-slips', 'salary-slips', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for salary-slips bucket
CREATE POLICY "Employees can download their own payslips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'salary-slips' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM hr_employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can upload payslips"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'salary-slips'
  AND EXISTS (
    SELECT 1 FROM hr_employees 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Admins can update payslips"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'salary-slips'
  AND EXISTS (
    SELECT 1 FROM hr_employees 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

CREATE POLICY "Admins can view all payslips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'salary-slips'
  AND EXISTS (
    SELECT 1 FROM hr_employees 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);