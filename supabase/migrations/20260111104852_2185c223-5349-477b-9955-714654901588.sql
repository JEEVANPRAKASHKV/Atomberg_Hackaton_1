-- New Work Log System Tables

-- Table 1: hr_work_log_weeks - Weekly summary and status
CREATE TABLE public.hr_work_log_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rework')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.hr_employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rework_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

-- Table 2: hr_work_log_tasks - Individual tasks per day
CREATE TABLE public.hr_work_log_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_log_id UUID NOT NULL REFERENCES public.hr_work_log_weeks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  day_status TEXT NOT NULL DEFAULT 'Draft' CHECK (day_status IN ('Draft', 'Submitted', 'Approved', 'Rework')),
  task_title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Meeting', 'Development', 'Support', 'Learning', 'Documentation', 'Design', 'Review', 'Planning', 'Admin', 'Other')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  assigned_by_type TEXT NOT NULL DEFAULT 'Self' CHECK (assigned_by_type IN ('Self', 'Employee', 'Manager', 'Admin')),
  assigned_by_id UUID REFERENCES public.hr_employees(id),
  description TEXT,
  rework_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_work_log_weeks_employee_date ON public.hr_work_log_weeks(employee_id, week_start_date);
CREATE INDEX idx_work_log_tasks_employee_date ON public.hr_work_log_tasks(employee_id, log_date);
CREATE INDEX idx_work_log_tasks_week_log ON public.hr_work_log_tasks(week_log_id, log_date);
CREATE INDEX idx_work_log_weeks_status ON public.hr_work_log_weeks(status);
CREATE INDEX idx_work_log_tasks_day_status ON public.hr_work_log_tasks(day_status);

-- Enable RLS
ALTER TABLE public.hr_work_log_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_work_log_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hr_work_log_weeks
CREATE POLICY "Employees can view their own week logs"
ON public.hr_work_log_weeks
FOR SELECT
USING (employee_id = user_employee_id());

CREATE POLICY "Employees can insert their own week logs"
ON public.hr_work_log_weeks
FOR INSERT
WITH CHECK (employee_id = user_employee_id());

CREATE POLICY "Employees can update their own draft/rework week logs"
ON public.hr_work_log_weeks
FOR UPDATE
USING (employee_id = user_employee_id() AND status IN ('Draft', 'Rework'));

CREATE POLICY "Managers can view team week logs"
ON public.hr_work_log_weeks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM hr_employees e 
    WHERE e.id = hr_work_log_weeks.employee_id 
    AND e.manager_id = user_employee_id()
  )
);

CREATE POLICY "Managers can update team week logs for approval"
ON public.hr_work_log_weeks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM hr_employees e 
    WHERE e.id = hr_work_log_weeks.employee_id 
    AND e.manager_id = user_employee_id()
  )
);

CREATE POLICY "Admins can view all week logs"
ON public.hr_work_log_weeks
FOR SELECT
USING (user_role() = 'Admin');

CREATE POLICY "Admins can update all week logs"
ON public.hr_work_log_weeks
FOR UPDATE
USING (user_role() = 'Admin');

-- RLS Policies for hr_work_log_tasks
CREATE POLICY "Employees can view their own tasks"
ON public.hr_work_log_tasks
FOR SELECT
USING (employee_id = user_employee_id());

CREATE POLICY "Employees can insert their own tasks"
ON public.hr_work_log_tasks
FOR INSERT
WITH CHECK (employee_id = user_employee_id());

CREATE POLICY "Employees can update their own tasks when editable"
ON public.hr_work_log_tasks
FOR UPDATE
USING (
  employee_id = user_employee_id() 
  AND day_status IN ('Draft', 'Rework')
);

CREATE POLICY "Employees can delete their own draft tasks"
ON public.hr_work_log_tasks
FOR DELETE
USING (
  employee_id = user_employee_id() 
  AND day_status = 'Draft'
);

CREATE POLICY "Managers can view team tasks"
ON public.hr_work_log_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM hr_employees e 
    WHERE e.id = hr_work_log_tasks.employee_id 
    AND e.manager_id = user_employee_id()
  )
);

CREATE POLICY "Managers can update team tasks for rework"
ON public.hr_work_log_tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM hr_employees e 
    WHERE e.id = hr_work_log_tasks.employee_id 
    AND e.manager_id = user_employee_id()
  )
);

CREATE POLICY "Admins can view all tasks"
ON public.hr_work_log_tasks
FOR SELECT
USING (user_role() = 'Admin');

CREATE POLICY "Admins can update all tasks"
ON public.hr_work_log_tasks
FOR UPDATE
USING (user_role() = 'Admin');

-- Trigger to update week totals when tasks change
CREATE OR REPLACE FUNCTION update_week_log_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE hr_work_log_weeks
    SET total_minutes = COALESCE((
      SELECT SUM(duration_minutes) FROM hr_work_log_tasks 
      WHERE week_log_id = OLD.week_log_id
    ), 0),
    updated_at = now()
    WHERE id = OLD.week_log_id;
    RETURN OLD;
  ELSE
    UPDATE hr_work_log_weeks
    SET total_minutes = COALESCE((
      SELECT SUM(duration_minutes) FROM hr_work_log_tasks 
      WHERE week_log_id = NEW.week_log_id
    ), 0),
    updated_at = now()
    WHERE id = NEW.week_log_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_week_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.hr_work_log_tasks
FOR EACH ROW EXECUTE FUNCTION update_week_log_totals();