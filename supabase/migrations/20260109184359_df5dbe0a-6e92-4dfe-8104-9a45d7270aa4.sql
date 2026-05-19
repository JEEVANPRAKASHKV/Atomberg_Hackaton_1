-- Create table for announcement reactions
CREATE TABLE public.hr_announcement_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.hr_announcements(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, employee_id, emoji)
);

-- Enable RLS
ALTER TABLE public.hr_announcement_reactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all reactions
CREATE POLICY "Users can view announcement reactions"
ON public.hr_announcement_reactions FOR SELECT
TO authenticated
USING (true);

-- Allow users to add their own reactions
CREATE POLICY "Users can add their own reactions"
ON public.hr_announcement_reactions FOR INSERT
TO authenticated
WITH CHECK (employee_id = public.user_employee_id());

-- Allow users to remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON public.hr_announcement_reactions FOR DELETE
TO authenticated
USING (employee_id = public.user_employee_id());

-- Add index for faster queries
CREATE INDEX idx_announcement_reactions_announcement ON public.hr_announcement_reactions(announcement_id);
CREATE INDEX idx_announcement_reactions_employee ON public.hr_announcement_reactions(employee_id);