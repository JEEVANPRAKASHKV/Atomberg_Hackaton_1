-- Add visible_to_team column to hr_appreciations for team-wise visibility
ALTER TABLE hr_appreciations ADD COLUMN IF NOT EXISTS visible_to_team TEXT DEFAULT 'All';

-- Update existing appreciations
UPDATE hr_appreciations SET visible_to_team = CASE WHEN is_public = true THEN 'All' ELSE 'Private' END WHERE visible_to_team IS NULL OR visible_to_team = 'All';

-- Ensure hr_employees has leave_balance column with default 18
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS leave_balance INTEGER DEFAULT 18;

-- Update any NULL leave_balance for active employees
UPDATE hr_employees SET leave_balance = 18 WHERE leave_balance IS NULL AND status = 'Active';